import asyncio
import os
from hf_provider import hf_chat
from dotenv import load_dotenv

load_dotenv()

async def main():
    print("Testing Hugging Face GLM-5 integration via Router...")
    hf_token = os.getenv("HF_TOKEN")
    if not hf_token:
        print("ERROR: HF_TOKEN not found in environment. Please add it to your .env file.")
        return

    hf_base_url = os.getenv("HF_BASE_URL", "https://router.huggingface.co/v1")
    model_id = os.getenv("HF_MODEL_ID", "zai-org/GLM-5:together")
    
    print(f"Using Endpoint: {hf_base_url}")
    print(f"Using Model: {model_id}")

    messages = [{"role": "user", "content": "What is the capital of France?"}]
    
    try:
        response = await hf_chat(model_id, messages)
        print("\nSUCCESS! Response from CORTEX HF-Router:")
        print(response["content"][0]["text"])
    except Exception as e:
        print(f"\nFAILED: {e}")

if __name__ == "__main__":
    asyncio.run(main())
