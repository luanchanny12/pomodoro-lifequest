import io
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import get_db, SessionLocal
from app.models import DailyMatrixTask, StudyGoal, AIBreakdownLog

client = TestClient(app)


def test_notebooklm_upload_source_txt():
    txt_content = b"Chuong 1: Tong quan Thuong mai dien tu B2B va B2C.\nChuong 2: Quy trinh thanh toan va bao mat SSL.\nChuong 3: Logistics trong TMDT."
    files = {"file": ("de_cuong_tmdt.txt", io.BytesIO(txt_content), "text/plain")}

    resp = client.post("/api/focus/ai/upload-source", files=files)
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["name"] == "de_cuong_tmdt.txt"
    assert data["source_type"] == "txt"
    assert "Chuong 1: Tong quan" in data["content"]
    assert data["words_count"] > 10


def test_notebooklm_preview_with_sources():
    sources = [
        {
            "name": "Slide_TMDT_Chuong1.pdf",
            "content": "Khai niem B2B la giao dich doanh nghiep voi doanh nghiep. B2C la ban le den nguoi tieu dung.",
            "source_type": "pdf",
            "words_count": 25,
            "page_count": 1,
        },
        {
            "name": "De_thi_mau_2025.docx",
            "content": "Cau 1: So sanh B2B va B2C. Cau 2: Uu nhuoc diem cua vi dien tu. Cau 3: Quy trinh van chuyen.",
            "source_type": "docx",
            "words_count": 25,
            "page_count": 1,
        },
    ]

    payload = {
        "title": "On thi Thuong mai dien tu",
        "target_date": "2026-11-20",
        "daily_hours": 2.0,
        "quadrant": 1,
        "sources": sources,
    }

    resp = client.post("/api/focus/ai/breakdown-preview", json=payload)
    assert resp.status_code == 200, resp.text
    data = resp.json()

    assert data["title"] == "On thi Thuong mai dien tu"
    assert data["days_count"] > 0
    assert len(data["tasks"]) > 0

    # Verify NotebookLM Studio artifacts
    assert "study_guide" in data and data["study_guide"] is not None
    sg = data["study_guide"]
    assert "briefing_summary" in sg and len(sg["briefing_summary"]) > 0
    assert "core_concepts" in sg and len(sg["core_concepts"]) > 0
    assert "exam_questions" in sg and len(sg["exam_questions"]) > 0
    assert "audio_overview_script" in sg and len(sg["audio_overview_script"]) > 0
    assert "Host A:" in sg["audio_overview_script"] or "Host B:" in sg["audio_overview_script"]

    # Verify tasks have source reference & key question
    task0 = data["tasks"][0]
    assert task0["quadrant"] == 1
    assert task0.get("source_reference") is not None
    assert task0.get("key_question") is not None


def test_notebooklm_ask_sources():
    sources = [
        {
            "name": "Giao_trinh_TMDT.txt",
            "content": "Bao mat trong thuong mai dien tu bao gom xac thuc RSA, ma hoa SSL/TLS va chu ky dien tu.",
            "source_type": "txt",
            "words_count": 20,
            "page_count": 1,
        }
    ]

    payload = {
        "subject": "Thuong mai dien tu",
        "question": "Cac phuong thuc bao mat chu yeu la gi?",
        "sources": sources,
    }

    resp = client.post("/api/focus/ai/ask-sources", json=payload)
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert "answer" in data and len(data["answer"]) > 0
    assert "citations" in data


def test_notebooklm_apply_with_source_reference():
    db = SessionLocal()
    try:
        tasks = [
            {
                "date": "2026-11-18",
                "title": "On tap Chuong 1: Mo hinh B2B va B2C",
                "quadrant": 1,
                "duration_minutes": 90,
                "notes": "Hoc ky dinh nghia",
                "source_reference": "Nguon: Slide_TMDT_Chuong1.pdf",
                "key_question": "B2B va B2C khac nhau nhu the nao?",
            }
        ]

        payload = {
            "title": "Kế hoạch NotebookLM",
            "target_date": "2026-11-20",
            "explanation": "Chiến lược Spaced Repetition",
            "tasks": tasks,
            "create_parent_goal": False,
        }

        resp = client.post("/api/focus/ai/apply-breakdown", json=payload)
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert data["ok"] is True
        batch_id = data["batch_id"]

        # Verify task created in database contains source ref in description
        created_task = db.query(DailyMatrixTask).filter(DailyMatrixTask.title == "On tap Chuong 1: Mo hinh B2B va B2C").first()
        assert created_task is not None
        assert "📌 Nguon: Slide_TMDT_Chuong1.pdf" in created_task.description
        assert "❓ B2B va B2C khac nhau nhu the nao?" in created_task.description

        # Clean rollback
        rollback_resp = client.post("/api/focus/ai/rollback-breakdown", json={"batch_id": batch_id})
        assert rollback_resp.status_code == 200
        assert db.query(DailyMatrixTask).filter(DailyMatrixTask.id == created_task.id).first() is None
    finally:
        db.close()
