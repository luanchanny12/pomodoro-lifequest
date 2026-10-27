from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import date, datetime, timedelta
from app.database import get_db
from app.models_schedule import StudySubject, StudySlot, WeeklyAvailability

router = APIRouter(prefix="/api/schedule", tags=["Schedule"])


class AvailabilityInput(BaseModel):
    date: str          # YYYY-MM-DD
    available_hours: float
    preferred_start: Optional[str] = "08:00"


class SubjectInput(BaseModel):
    name: str
    total_weeks: int = 4
    availability: List[AvailabilityInput]  # 14 days
    color: Optional[str] = "#00E5FF"


class SlotOut(BaseModel):
    id: int
    date: str
    start_time: str
    duration_min: int
    is_done: bool
    subject_name: str
    subject_color: str

    class Config:
        from_attributes = True


class SubjectOut(BaseModel):
    id: int
    name: str
    total_weeks: int
    hours_per_week: float
    color: str
    is_active: bool
    created_at: str

    class Config:
        from_attributes = True


def _generate_slots(subject: StudySubject, availability: List[AvailabilityInput]) -> List[StudySlot]:
    """Generate study slots based on availability."""
    slots = []
    total_hours = subject.total_weeks * subject.hours_per_week
    remaining_minutes = int(total_hours * 60)

    # Sort availability by date
    avail_sorted = sorted(availability, key=lambda x: x.date)

    for av in avail_sorted:
        if remaining_minutes <= 0:
            break
        if av.available_hours <= 0:
            continue

        day_minutes = min(int(av.available_hours * 60), remaining_minutes)
        # Split into sessions of max 90 min
        session_dur = 90 if day_minutes > 90 else day_minutes

        slot_date = datetime.strptime(av.date, "%Y-%m-%d").date()
        start_h, start_m = map(int, (av.preferred_start or "08:00").split(":"))

        allocated = 0
        while allocated < day_minutes and remaining_minutes > 0:
            dur = min(session_dur, day_minutes - allocated, remaining_minutes)
            if dur < 15:
                break
            slot = StudySlot(
                subject_id=subject.id,
                date=slot_date,
                start_time=f"{start_h:02d}:{start_m:02d}",
                duration_min=dur,
                is_done=False
            )
            slots.append(slot)
            # advance start time
            total_m = start_h * 60 + start_m + dur + 15  # 15 min break
            start_h = total_m // 60
            start_m = total_m % 60
            allocated += dur
            remaining_minutes -= dur

    return slots


@router.post("/subject", response_model=SubjectOut)
def create_subject_schedule(data: SubjectInput, db: Session = Depends(get_db)):
    """Create a new subject with auto-generated study schedule."""
    # Calculate hours per week from availability
    total_available = sum(a.available_hours for a in data.availability)
    weeks = max(data.total_weeks, 1)
    hours_per_week = total_available / 2  # 14 days = ~2 weeks as sample

    subject = StudySubject(
        name=data.name,
        total_weeks=data.total_weeks,
        hours_per_week=hours_per_week,
        color=data.color or "#00E5FF",
        is_active=True
    )
    db.add(subject)
    db.flush()  # get subject.id

    # Save availability
    for av in data.availability:
        av_date = datetime.strptime(av.date, "%Y-%m-%d").date()
        existing = db.query(WeeklyAvailability).filter(WeeklyAvailability.date == av_date).first()
        if existing:
            existing.available_hours = av.available_hours
            existing.preferred_start = av.preferred_start or "08:00"
        else:
            db.add(WeeklyAvailability(
                date=av_date,
                available_hours=av.available_hours,
                preferred_start=av.preferred_start or "08:00"
            ))

    # Generate and save slots
    slots = _generate_slots(subject, data.availability)
    for s in slots:
        db.add(s)

    db.commit()
    db.refresh(subject)
    return SubjectOut(
        id=subject.id,
        name=subject.name,
        total_weeks=subject.total_weeks,
        hours_per_week=subject.hours_per_week,
        color=subject.color,
        is_active=subject.is_active,
        created_at=subject.created_at.isoformat()
    )


@router.get("/subjects", response_model=List[SubjectOut])
def list_subjects(db: Session = Depends(get_db)):
    subjects = db.query(StudySubject).filter(StudySubject.is_active == True).all()
    return [SubjectOut(
        id=s.id, name=s.name, total_weeks=s.total_weeks,
        hours_per_week=s.hours_per_week, color=s.color,
        is_active=s.is_active, created_at=s.created_at.isoformat()
    ) for s in subjects]


@router.get("/today", response_model=List[SlotOut])
def get_today_schedule(db: Session = Depends(get_db)):
    today = date.today()
    slots = db.query(StudySlot).filter(StudySlot.date == today).all()
    result = []
    for slot in slots:
        subj = db.query(StudySubject).filter(StudySubject.id == slot.subject_id).first()
        result.append(SlotOut(
            id=slot.id,
            date=str(slot.date),
            start_time=slot.start_time,
            duration_min=slot.duration_min,
            is_done=slot.is_done,
            subject_name=subj.name if subj else "Unknown",
            subject_color=subj.color if subj else "#00E5FF"
        ))
    result.sort(key=lambda x: x.start_time)
    return result


@router.get("/week", response_model=List[SlotOut])
def get_week_schedule(db: Session = Depends(get_db)):
    today = date.today()
    week_end = today + timedelta(days=6)
    slots = db.query(StudySlot).filter(
        StudySlot.date >= today,
        StudySlot.date <= week_end
    ).all()
    result = []
    for slot in slots:
        subj = db.query(StudySubject).filter(StudySubject.id == slot.subject_id).first()
        result.append(SlotOut(
            id=slot.id,
            date=str(slot.date),
            start_time=slot.start_time,
            duration_min=slot.duration_min,
            is_done=slot.is_done,
            subject_name=subj.name if subj else "Unknown",
            subject_color=subj.color if subj else "#00E5FF"
        ))
    result.sort(key=lambda x: (x.date, x.start_time))
    return result


@router.patch("/slot/{slot_id}/done")
def mark_slot_done(slot_id: int, db: Session = Depends(get_db)):
    slot = db.query(StudySlot).filter(StudySlot.id == slot_id).first()
    if not slot:
        raise HTTPException(404, "Slot not found")
    slot.is_done = not slot.is_done
    db.commit()
    return {"id": slot.id, "is_done": slot.is_done}


class MoveSlotInput(BaseModel):
    date: Optional[str] = None         # YYYY-MM-DD
    start_time: Optional[str] = None   # HH:MM
    duration_min: Optional[int] = None


@router.patch("/slot/{slot_id}/move")
def move_slot(slot_id: int, data: MoveSlotInput, db: Session = Depends(get_db)):
    """Move a study slot to a different date/time."""
    slot = db.query(StudySlot).filter(StudySlot.id == slot_id).first()
    if not slot:
        raise HTTPException(404, "Slot not found")
    if data.date is not None:
        try:
            slot.date = datetime.strptime(data.date, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(400, "Invalid date format (use YYYY-MM-DD)")
    if data.start_time is not None:
        slot.start_time = data.start_time
    if data.duration_min is not None:
        slot.duration_min = data.duration_min
    db.commit()
    subj = db.query(StudySubject).filter(StudySubject.id == slot.subject_id).first()
    return SlotOut(
        id=slot.id,
        date=str(slot.date),
        start_time=slot.start_time,
        duration_min=slot.duration_min,
        is_done=slot.is_done,
        subject_name=subj.name if subj else "Unknown",
        subject_color=subj.color if subj else "#00E5FF"
    )


@router.get("/availability/next-14")
def get_availability_next_14(db: Session = Depends(get_db)):
    """Get availability for the next 14 days (existing entries)."""
    today_d = date.today()
    end = today_d + timedelta(days=14)
    rows = db.query(WeeklyAvailability).filter(
        WeeklyAvailability.date >= today_d,
        WeeklyAvailability.date < end
    ).order_by(WeeklyAvailability.date).all()
    return [
        {"date": str(r.date), "available_hours": r.available_hours, "preferred_start": r.preferred_start}
        for r in rows
    ]


class BulkAvailabilityInput(BaseModel):
    availability: List[AvailabilityInput]


@router.post("/availability/next-14")
def save_availability_next_14(data: BulkAvailabilityInput, db: Session = Depends(get_db)):
    """Save bulk availability for the next 14 days."""
    saved = 0
    for av in data.availability:
        av_date = datetime.strptime(av.date, "%Y-%m-%d").date()
        existing = db.query(WeeklyAvailability).filter(WeeklyAvailability.date == av_date).first()
        if existing:
            existing.available_hours = av.available_hours
            existing.preferred_start = av.preferred_start or "08:00"
        else:
            db.add(WeeklyAvailability(
                date=av_date,
                available_hours=av.available_hours,
                preferred_start=av.preferred_start or "08:00"
            ))
        saved += 1
    db.commit()
    return {"saved": saved}


@router.delete("/subject/{subject_id}")
def delete_subject(subject_id: int, db: Session = Depends(get_db)):
    subject = db.query(StudySubject).filter(StudySubject.id == subject_id).first()
    if not subject:
        raise HTTPException(404, "Subject not found")
    subject.is_active = False
    db.commit()
    return {"ok": True}
