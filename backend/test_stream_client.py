import httpx
import json
import sys

def main():
    url = "http://127.0.0.1:8000/api/chat/stream"
    payload = {
        "history": [
            {"role": "user", "content": "Hello, can you help me write code?"}
        ]
    }
    
    print("Testing connection to AetherChat FastAPI streaming endpoint...")
    try:
        with httpx.stream("POST", url, json=payload, timeout=10.0) as response:
            if response.status_code != 200:
                print(f"Error: Server returned status code {response.status_code}")
                sys.exit(1)
            
            print(f"Status Code: {response.status_code}")
            print(f"Content Type: {response.headers.get('content-type')}")
            print("--- Streaming response chunks ---")
            
            accumulated_text = ""
            done_received = False
            
            for line in response.iter_lines():
                if line.startswith("data: "):
                    data_str = line[len("data: "):]
                    if data_str == "[DONE]":
                        done_received = True
                        break
                    
                    try:
                        data_json = json.loads(data_str)
                        if "text" in data_json:
                            chunk = data_json["text"]
                            accumulated_text += chunk
                            sys.stdout.write(chunk)
                            sys.stdout.flush()
                        elif "error" in data_json:
                            print(f"\nAPI Error: {data_json['error']}")
                            sys.exit(1)
                    except json.JSONDecodeError:
                        print(f"\nFailed to parse line: {line}")
                        sys.exit(1)
            
            print("\n---------------------------------")
            if done_received:
                print("Verification passed! SSE Stream finished with [DONE] token.")
                print(f"Accumulated response length: {len(accumulated_text)} characters.")
                sys.exit(0)
            else:
                print("Error: Stream ended without [DONE] token.")
                sys.exit(1)
            
    except Exception as e:
        print(f"Connection failed: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()
