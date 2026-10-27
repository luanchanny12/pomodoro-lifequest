import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_calendar_ics_download():
    response = client.get("/api/calendar/pomodoro-reminders.ics")
    assert response.status_code == 200
    assert "text/calendar" in response.headers.get("content-type", "")
    assert 'filename="pomodoro-reminders.ics"' in response.headers.get("content-disposition", "")

    content = response.text
    assert "BEGIN:VCALENDAR" in content
    assert "END:VCALENDAR" in content
    assert "BEGIN:VEVENT" in content
    assert "RRULE:FREQ=DAILY" in content
    assert "pomodoro-morning-daily" in content
    assert "pomodoro-evening-daily" in content
