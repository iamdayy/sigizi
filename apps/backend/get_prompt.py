import json

with open("/home/iamdayy/.gemini/antigravity-ide/brain/68e0a3f9-3ddd-4061-8c3d-548606ce17d0/.system_generated/logs/transcript_full.jsonl") as f:
    for line in f:
        data = json.loads(line)
        if data.get("type") == "USER_INPUT":
            print(data["content"])
            break
