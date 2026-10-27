import json
import os
import requests


GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
GEMINI_URL = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent"


def _convert_schema(simple_schema):
    """Convert simplified schema format to proper JSON Schema for responseSchema."""
    type_map = {"str": "string", "int": "integer", "float": "number", "bool": "boolean"}
    if isinstance(simple_schema, dict):
        if "type" in simple_schema:
            return simple_schema
        props = {}
        required = []
        for k, v in simple_schema.items():
            props[k] = _convert_schema(v)
            required.append(k)
        return {"type": "object", "properties": props, "required": required}
    elif isinstance(simple_schema, list):
        if not simple_schema:
            return {"type": "array", "items": {}}
        return {"type": "array", "items": _convert_schema(simple_schema[0])}
    elif isinstance(simple_schema, str):
        t = type_map.get(simple_schema, "string")
        return {"type": t}
    return {"type": "string"}


def call_gemini(prompt: str, response_schema: dict = None) -> dict:
    if not GEMINI_API_KEY:
        return {"error": "no_key", "message": "Gemini API key not configured"}
    try:
        system_instruction = "Bạn là AI Coach của LIFE QUEST. Luôn trả lời bằng tiếng Việt. "
        system_instruction += "Trả về JSON đúng cấu trúc, không thêm text ngoài JSON."

        generation_config = {
            "temperature": 0.4,
            "topK": 40,
            "topP": 0.95,
            "maxOutputTokens": 8192,
            "responseMimeType": "application/json",
        }
        if response_schema:
            generation_config["responseSchema"] = _convert_schema(response_schema)
            system_instruction += f"\nCấu trúc JSON: {json.dumps(response_schema, ensure_ascii=False, indent=2)}"

        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "systemInstruction": {"parts": [{"text": system_instruction}]},
            "generationConfig": generation_config,
        }
        resp = requests.post(
            f"{GEMINI_URL}?key={GEMINI_API_KEY}",
            json=payload, timeout=60
        )
        if resp.status_code != 200:
            return {"error": "api_error", "message": f"Gemini API error: {resp.status_code} - {resp.text[:200]}"}
        data = resp.json()
        candidates = data.get("candidates", [])
        if not candidates:
            return {"error": "empty", "message": "Gemini returned no candidates"}
        parts = candidates[0].get("content", {}).get("parts", [])
        if not parts:
            return {"error": "empty", "message": "Gemini returned no content"}
        text = parts[0].get("text", "")
        if not text:
            return {"error": "empty", "message": "Gemini returned empty text"}
        return json.loads(text) if isinstance(text, str) else text
    except Exception as e:
        import logging
        logging.error(f"Gemini call error: {e}")
        return {"error": "exception", "message": str(e)}


def chat_with_gemini_stream(message: str, history: list = None, system_context: str = ""):
    """Stream Gemini response chunk by chunk (generator)."""
    if not GEMINI_API_KEY:
        return
    GEMINI_STREAM_URL = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:streamGenerateContent?alt=sse"
    try:
        parts = []
        if history:
            for h in history[-10:]:
                parts.append({"text": f"{h['role']}: {h['message']}"})
        parts.append({"text": message})
        system_prompt = (
            "Bạn là AI Coach thân thiện của LIFE QUEST — hệ thống quản lý học tập gamification.\n\n"
            "### CÁCH TRẢ LỜI:\n"
            "- Luôn trả lời bằng tiếng Việt, GIỌNG ẤM ÁP, đồng cảm, như một người bạn\n"
            "- Dùng icon phù hợp 😊💪🎯\n"
            "- Dựa vào DỮ LIỆU NGƯỜI DÙNG bên dưới để tư vấn CÁ NHÂN HÓA\n"
            "- Phân tích cụ thể, đưa gợi ý cải thiện rõ ràng\n"
            "- Dùng thành tích để khích lệ, dùng số liệu để thuyết phục\n"
            "- Trả lời DÀI, CHI TIẾT, ĐẦY ĐỦ (tối thiểu 5-7 câu, tối đa 2000 từ)\n"
            "- Không trả lời cụt lủn kiểu robot\n\n"
            "### PHÁT HIỆN Ý ĐỊNH TẠO KẾ HOẠCH:\n"
            "- Nếu người dùng nói về mục tiêu + lịch rảnh (VD: \"muốn học IELTS mỗi ngày 2 tiếng\", \"rảnh tối 3 tiếng\"), hãy xác nhận thông tin và hướng dẫn họ nói \"Lên kế hoạch 14 ngày giúp mình\" để hệ thống tự tạo tasks.\n"
            "- KHÔNG tự ý tạo kế hoạch — chỉ hướng dẫn họ yêu cầu đúng câu lệnh."
        )
        if system_context:
            system_prompt += f"\n\n=== DỮ LIỆU NGƯỜI DÙNG HIỆN TẠI ===\n{system_context}"
        payload = {
            "contents": [{"parts": parts}],
            "systemInstruction": {"parts": [{"text": system_prompt}]},
            "generationConfig": {
                "temperature": 0.85,
                "maxOutputTokens": 8192,
            }
        }
        resp = requests.post(
            f"{GEMINI_STREAM_URL}&key={GEMINI_API_KEY}",
            json=payload, stream=True, timeout=120
        )
        if resp.status_code != 200:
            return
        for line in resp.iter_lines():
            if line:
                line = line.decode('utf-8')
                if line.startswith('data: '):
                    data_str = line[6:].strip()
                    if data_str == '[DONE]':
                        break
                    try:
                        chunk = json.loads(data_str)
                        text = chunk.get('candidates', [{}])[0].get('content', {}).get('parts', [{}])[0].get('text', '')
                        if text:
                            yield text
                    except (json.JSONDecodeError, KeyError):
                        continue
    except Exception as e:
        import logging
        logging.error(f"Gemini stream error: {e}")


def chat_with_gemini(message: str, history: list = None, system_context: str = "") -> str:
    """Gửi tin nhắn chat đến Gemini với context database, trả về text reply."""
    if not GEMINI_API_KEY:
        return ""
    try:
        parts = []
        if history:
            for h in history[-10:]:
                parts.append({"text": f"{h['role']}: {h['message']}"})
        parts.append({"text": message})
        system_prompt = (
            "Bạn là AI Coach thân thiện của LIFE QUEST — hệ thống quản lý học tập gamification.\n\n"
            "### CÁCH TRẢ LỜI:\n"
            "- Luôn trả lời bằng tiếng Việt, GIỌNG ẤM ÁP, đồng cảm, như một người bạn\n"
            "- Dùng icon phù hợp 😊💪🎯\n"
            "- Dựa vào DỮ LIỆU NGƯỜI DÙNG bên dưới để tư vấn CÁ NHÂN HÓA\n"
            "- Phân tích cụ thể, đưa gợi ý cải thiện rõ ràng\n"
            "- Dùng thành tích để khích lệ, dùng số liệu để thuyết phục\n"
            "- Trả lời DÀI, CHI TIẾT, ĐẦY ĐỦ (tối thiểu 5-7 câu, tối đa 2000 từ)\n"
            "- Không trả lời cụt lủn kiểu robot\n\n"
            "### PHÁT HIỆN Ý ĐỊNH TẠO KẾ HOẠCH:\n"
            "- Nếu người dùng nói về mục tiêu + lịch rảnh (VD: \"muốn học IELTS mỗi ngày 2 tiếng\", \"rảnh tối 3 tiếng\"), hãy xác nhận thông tin và hướng dẫn họ nói \"Lên kế hoạch 14 ngày giúp mình\" để hệ thống tự tạo tasks.\n"
            "- KHÔNG tự ý tạo kế hoạch — chỉ hướng dẫn họ yêu cầu đúng câu lệnh."
        )
        if system_context:
            system_prompt += f"\n\n=== DỮ LIỆU NGƯỜI DÙNG HIỆN TẠI ===\n{system_context}"
        payload = {
            "contents": [{"parts": parts}],
            "systemInstruction": {"parts": [{"text": system_prompt}]},
            "generationConfig": {
                "temperature": 0.85,
                "maxOutputTokens": 8192,
            }
        }
        resp = requests.post(
            f"{GEMINI_URL}?key={GEMINI_API_KEY}",
            json=payload, timeout=120
        )
        if resp.status_code != 200:
            return ""
        data = resp.json()
        return data["candidates"][0]["content"]["parts"][0]["text"]
    except Exception as e:
        import logging
        logging.error(f"Gemini chat error: {e}")
        return ""


def analyze_document_with_gemini(prompt: str) -> dict:
    """
    Gửi nội dung tài liệu + profile người dùng lên Gemini,
    yêu cầu trả về JSON: summary, tasks[], total_hours, difficulty.
    Fallback về dict rỗng nếu không có key.
    """
    if not GEMINI_API_KEY:
        return {"summary": "Vui lòng cấu hình GEMINI_API_KEY trong .env", "tasks": [], "total_hours": 0}
    try:
        schema = {
            "summary": "str - Tóm tắt nội dung tài liệu và kế hoạch đề xuất",
            "subject": "str - Tên môn học/chủ đề",
            "difficulty": "str - easy/medium/hard",
            "total_hours_estimate": "float - Tổng số giờ ước tính",
            "tasks": [
                {
                    "title": "str - Tên nhiệm vụ",
                    "description": "str - Mô tả chi tiết",
                    "goal_type": "str - gpa/ielts/devops",
                    "estimated_minutes": "int - Phút ước tính",
                    "difficulty": "int - 1-5",
                    "order": "int - Thứ tự học"
                }
            ],
            "weekly_schedule": {
                "sessions_per_week": "int",
                "minutes_per_session": "int",
                "recommended_days": ["str - Thứ 2, Thứ 4,..."]
            },
            "prerequisites": ["str - Kiến thức cần có trước khi học"],
            "tools_needed": ["str - Công cụ/phần mềm cần chuẩn bị"]
        }
        system_instruction = (
            "Bạn là AI Coach LIFE QUEST chuyên phân tích tài liệu học tập. "
            "Luôn trả lời bằng tiếng Việt. "
            "Dựa vào nội dung tài liệu và hồ sơ người dùng để đưa ra kế hoạch chi tiết. "
            "Trả về JSON đúng cấu trúc, không thêm text ngoài JSON."
        )
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "systemInstruction": {"parts": [{"text": system_instruction}]},
            "generationConfig": {
                "temperature": 0.3,
                "maxOutputTokens": 4096,
                "responseMimeType": "application/json",
                "responseSchema": {
                    "type": "object",
                    "properties": {
                        "summary": {"type": "string"},
                        "subject": {"type": "string"},
                        "difficulty": {"type": "string"},
                        "total_hours_estimate": {"type": "number"},
                        "tasks": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "title": {"type": "string"},
                                    "description": {"type": "string"},
                                    "goal_type": {"type": "string"},
                                    "estimated_minutes": {"type": "integer"},
                                    "difficulty": {"type": "integer"},
                                    "order": {"type": "integer"}
                                }
                            }
                        },
                        "weekly_schedule": {
                            "type": "object",
                            "properties": {
                                "sessions_per_week": {"type": "integer"},
                                "minutes_per_session": {"type": "integer"},
                                "recommended_days": {"type": "array", "items": {"type": "string"}}
                            }
                        },
                        "prerequisites": {"type": "array", "items": {"type": "string"}},
                        "tools_needed": {"type": "array", "items": {"type": "string"}}
                    }
                }
            }
        }
        resp = requests.post(f"{GEMINI_URL}?key={GEMINI_API_KEY}", json=payload, timeout=60)
        if resp.status_code != 200:
            return {"summary": f"Lỗi API: {resp.status_code}", "tasks": [], "total_hours": 0}
        data = resp.json()
        text = data["candidates"][0]["content"]["parts"][0]["text"]
        return json.loads(text) if isinstance(text, str) else text
    except Exception as e:
        return {"summary": f"Lỗi: {str(e)}", "tasks": [], "total_hours": 0}


def build_ai_json(analysis: dict) -> dict:
    return {
        "summary": analysis.get("summary", ""),
        "coachMessage": analysis.get("coach_message", ""),
        "reason": analysis.get("reason", ""),
        "priorityScore": analysis.get("priority_scores", []),
        "blocks": analysis.get("blocks", []),
        "prediction": analysis.get("prediction", {}),
        "risk": analysis.get("risk", {}),
        "confidence": analysis.get("confidence", {}),
        "reviewPlan": analysis.get("review_plan", []),
        "nextLesson": analysis.get("next_lesson", {}),
        "warnings": analysis.get("warnings", []),
        "motivation": analysis.get("motivation", "")
    }
