"""
hf_provider.py
--------------
Native Hugging Face support for CORTEX via the HF Router.
Users can now use GLM-5 and other models through the OpenAI-compatible HF Router.

Usage (.env):
    HF_TOKEN=your-hf-token
    HF_MODEL_ID=zai-org/GLM-5:together
    HF_BASE_URL=https://router.huggingface.co/v1
"""

import os
import json
import logging
from typing import AsyncIterator, List, Dict, Optional
from openai import AsyncOpenAI
from dotenv import load_dotenv

# Load .env if present
load_dotenv()

logger = logging.getLogger(__name__)

HF_TOKEN = os.getenv("HF_TOKEN")
HF_MODEL_ID = os.getenv("HF_MODEL_ID", "zai-org/GLM-5:together")
HF_BASE_URL = os.getenv("HF_BASE_URL", "https://router.huggingface.co/v1")

# Initialize OpenAI-compatible client for HF
client = AsyncOpenAI(
    base_url=HF_BASE_URL,
    api_key=HF_TOKEN
)

def cortex_to_hf_messages(messages: List[Dict]) -> List[Dict]:
    """Convert CORTEX format to OpenAI-compatible format."""
    hf_messages = []
    for msg in messages:
        role = msg.get("role", "user")
        content = msg.get("content", "")
        # Handle list content (text/image blocks)
        if isinstance(content, list):
            text_parts = []
            for block in content:
                if isinstance(block, dict) and block.get("type") == "text":
                    text_parts.append(block.get("text", ""))
                elif isinstance(block, str):
                    text_parts.append(block)
            content = "\n".join(text_parts)
        
        hf_messages.append({"role": role, "content": content})
    return hf_messages

async def hf_chat(
    model: str,
    messages: List[Dict],
    system: Optional[str] = None,
    max_tokens: int = 4096,
    temperature: float = 0.7,
) -> Dict:
    """Non-streaming chat completion via HF Router."""
    chat_messages = cortex_to_hf_messages(messages)
    if system:
        chat_messages.insert(0, {"role": "system", "content": system})

    response = await client.chat.completions.create(
        model=model or HF_MODEL_ID,
        messages=chat_messages,
        max_tokens=max_tokens,
        temperature=temperature,
        stream=False
    )

    assistant_text = response.choices[0].message.content
    
    return {
        "id": f"msg_hf_{response.id}",
        "type": "message",
        "role": "assistant",
        "content": [{"type": "text", "text": assistant_text}],
        "model": model,
        "stop_reason": "end_turn",
        "stop_sequence": None,
        "usage": {
            "input_tokens": response.usage.prompt_tokens,
            "output_tokens": response.usage.completion_tokens,
        },
    }

async def hf_chat_stream(
    model: str,
    messages: List[Dict],
    system: Optional[str] = None,
    max_tokens: int = 4096,
    temperature: float = 0.7,
) -> AsyncIterator[str]:
    """Streaming chat completion via HF Router."""
    chat_messages = cortex_to_hf_messages(messages)
    if system:
        chat_messages.insert(0, {"role": "system", "content": system})

    yield "event: message_start\n"
    yield f'data: {json.dumps({"type": "message_start", "message": {"id": "msg_hf_stream", "type": "message", "role": "assistant", "content": [], "model": model, "stop_reason": None, "usage": {"input_tokens": 0, "output_tokens": 0}}})}\n\n'
    yield "event: content_block_start\n"
    yield f'data: {json.dumps({"type": "content_block_start", "index": 0, "content_block": {"type": "text", "text": ""}})}\n\n'

    async for chunk in await client.chat.completions.create(
        model=model or HF_MODEL_ID,
        messages=chat_messages,
        max_tokens=max_tokens,
        temperature=temperature,
        stream=True
    ):
        if not chunk.choices:
            continue
        delta_text = chunk.choices[0].delta.content
        if delta_text:
            yield "event: content_block_delta\n"
            yield f'data: {json.dumps({"type": "content_block_delta", "index": 0, "delta": {"type": "text_delta", "text": delta_text}})}\n\n'
        
        if chunk.choices[0].finish_reason:
            yield "event: content_block_stop\n"
            yield f'data: {json.dumps({"type": "content_block_stop", "index": 0})}\n\n'
            yield "event: message_delta\n"
            yield f'data: {json.dumps({"type": "message_delta", "delta": {"stop_reason": "end_turn", "stop_sequence": None}, "usage": {"output_tokens": 0}})}\n\n'
            yield "event: message_stop\n"
            yield f'data: {json.dumps({"type": "message_stop"})}\n\n'
            break
