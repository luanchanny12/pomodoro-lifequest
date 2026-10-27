COGNITIVE_LOAD = {
    "vocabulary": 20, "ipa": 15, "listening": 50,
    "reading": 80, "writing": 90, "speaking": 75,
    "linux": 60, "git": 40, "networking": 65,
    "docker": 70, "docker_compose": 60, "cicd": 80,
    "aws": 85, "kubernetes": 90, "terraform": 85,
    "monitoring": 60, "math": 75, "physics": 70,
    "chemistry": 65, "english": 30, "gpa": 65,
    "ielts": 55, "devops": 75, "review": 20,
    "quiz": 40, "mock_test": 90, "project": 85,
}


def get_cognitive_load(activity_type: str) -> int:
    key = activity_type.lower().replace(" ", "_")
    if key in COGNITIVE_LOAD:
        return COGNITIVE_LOAD[key]
    for k, v in COGNITIVE_LOAD.items():
        if k in key or key in k:
            return v
    return 50


def is_heavy_task(activity_type: str) -> bool:
    return get_cognitive_load(activity_type) >= 70


def is_compatible_sequence(activities: list) -> bool:
    for i in range(len(activities) - 1):
        load1 = get_cognitive_load(activities[i])
        load2 = get_cognitive_load(activities[i + 1])
        if load1 >= 70 and load2 >= 70:
            return False
    return True


def optimize_schedule(blocks: list) -> list:
    scored = []
    for b in blocks:
        load = get_cognitive_load(b.get("goal_type", ""))
        scored.append((load, b))
    scored.sort(key=lambda x: x[0], reverse=True)

    heavy = [s for s in scored if s[0] >= 70]
    light = [s for s in scored if s[0] < 70]

    result = []
    h_idx, l_idx = 0, 0
    heavy_first = True
    while h_idx < len(heavy) or l_idx < len(light):
        if heavy_first and h_idx < len(heavy):
            result.append(heavy[h_idx][1])
            h_idx += 1
        elif l_idx < len(light):
            result.append(light[l_idx][1])
            l_idx += 1
        elif h_idx < len(heavy):
            result.append(heavy[h_idx][1])
            h_idx += 1
        heavy_first = not heavy_first
    return result


def get_break_suggestion(blocks: list) -> list:
    suggestions = []
    for i in range(len(blocks) - 1):
        cur_load = get_cognitive_load(blocks[i].get("goal_type", ""))
        next_load = get_cognitive_load(blocks[i + 1].get("goal_type", ""))
        if cur_load >= 70 and next_load >= 70:
            suggestions.append({
                "between": f"{blocks[i].get('start_time')}-{blocks[i+1].get('end_time')}",
                "suggestion": "Chèn bài nhẹ (Vocabulary/IPA) hoặc nghỉ 15 phút"
            })
    return suggestions
