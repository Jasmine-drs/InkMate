"""
AI 服务客户端 - OpenAI API 集成
"""
import json
from typing import AsyncGenerator, Optional, Dict, Any, List
from loguru import logger
from fastapi import HTTPException, status

try:
    import httpx
except ImportError:
    httpx = None

from config import settings


class AIClient:
    """AI 客户端 - 支持 OpenAI 及兼容 API"""

    def __init__(self):
        self.api_key = settings.OPENAI_API_KEY
        self.base_url = settings.OPENAI_BASE_URL or "https://api.openai.com/v1"
        self.model = settings.GENERATION_MODEL
        self.max_tokens = settings.MAX_TOKENS
        self.temperature = settings.TEMPERATURE
        self._client: Optional[httpx.AsyncClient] = None

    async def _get_client(self) -> httpx.AsyncClient:
        """获取 HTTP 客户端"""
        if self._client is None:
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            }
            # ModelScope API 需要额外的 User-Agent
            if "modelscope.cn" in self.base_url:
                headers["X-DashScope-User"] = "novel-writer"

            self._client = httpx.AsyncClient(
                base_url=self.base_url,
                timeout=httpx.Timeout(60.0, read=120.0),
                headers=headers
            )
        return self._client

    async def close(self):
        """关闭客户端"""
        if self._client:
            await self._client.aclose()
            self._client = None

    def _build_chat_prompt(
        self,
        system_prompt: str,
        user_prompt: str,
        context: Optional[str] = None,
    ) -> List[Dict[str, str]]:
        """构建聊天提示"""
        messages = [
            {"role": "system", "content": system_prompt}
        ]

        # 添加上下文
        if context:
            messages.append({"role": "user", "content": f"上下文信息:\n{context}"})

        messages.append({"role": "user", "content": user_prompt})
        return messages

    async def generate(
        self,
        prompt: str,
        system_prompt: str = "你是一个专业的小说创作助手。",
        context: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
    ) -> str:
        """生成内容（非流式）"""
        if not self.api_key:
            logger.warning("未配置 OPENAI_API_KEY，返回空字符串")
            return ""

        client = await self._get_client()
        messages = self._build_chat_prompt(system_prompt, prompt, context)

        # 确保温度在有效范围内 (0-2)
        effective_temp = min(max(temperature or self.temperature, 0.0), 2.0)

        try:
            request_data = {
                "model": self.model,
                "messages": messages,
                "temperature": effective_temp,
                "max_tokens": max_tokens or self.max_tokens,
            }
            logger.debug(f"AI 请求：model={self.model}, messages_count={len(messages)}, temperature={effective_temp}")

            response = await client.post(
                "/chat/completions",
                json=request_data,
            )

            if not response.is_success:
                error_body = response.text
                logger.error(f"AI API 错误：status={response.status_code}, body={error_body}")
                # 返回通用错误信息，不泄露 API 细节
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"AI 服务响应错误 (HTTP {response.status_code})"
                )

            data = response.json()
            if not data.get("choices") or not data["choices"][0].get("message"):
                logger.error(f"AI 响应格式异常：{data}")
                raise ValueError("AI 响应格式异常")

            return data["choices"][0]["message"]["content"]
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"AI 生成失败：{e}")
            raise

    async def generate_stream(
        self,
        prompt: str,
        system_prompt: str = "你是一个专业的小说创作助手。",
        context: Optional[str] = None,
        temperature: Optional[float] = None,
    ) -> AsyncGenerator[str, None]:
        """流式生成内容"""
        if not self.api_key:
            logger.warning("未配置 OPENAI_API_KEY，返回空字符串")
            yield ""
            return

        client = await self._get_client()
        messages = self._build_chat_prompt(system_prompt, prompt, context)

        # 确保温度在有效范围内 (0-2)
        effective_temp = min(max(temperature or self.temperature, 0.0), 2.0)

        try:
            async with client.stream(
                "POST",
                "/chat/completions",
                json={
                    "model": self.model,
                    "messages": messages,
                    "temperature": effective_temp,
                    "max_tokens": self.max_tokens,
                    "stream": True,
                }
            ) as response:
                if not response.is_success:
                    error_body = await response.aread()
                    logger.error(f"AI 流式 API 错误：status={response.status_code}, body={error_body.decode()}")
                    yield f"data: {json.dumps({'error': 'AI 生成失败'})}\n\n"
                    return

                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        data = line[6:]
                        if data == "[DONE]":
                            break
                        try:
                            chunk = json.loads(data)
                            if chunk["choices"] and chunk["choices"][0]["delta"].get("content"):
                                yield chunk["choices"][0]["delta"]["content"]
                        except json.JSONDecodeError:
                            continue
        except Exception as e:
            logger.error(f"AI 流式生成失败：{e}")
            raise

    async def generate_chapter(
        self,
        chapter_title: str,
        outline: Optional[str] = None,
        previous_content: Optional[str] = None,
        character_notes: Optional[str] = None,
        style_guide: Optional[str] = None,
    ) -> str:
        """生成章节内容"""
        system_prompt = """你是一个专业的 AI 小说创作助手，擅长创作引人入胜的小说章节。
请根据提供的大纲、角色设定和写作风格指南，创作高质量的章节内容。

要求：
1. 保持角色性格一致性
2. 情节发展合理
3. 文笔流畅生动
4. 符合给定的写作风格"""

        # 构建上下文
        context_parts = []
        if outline:
            context_parts.append(f"本章大纲：\n{outline}")
        if previous_content:
            context_parts.append(f"前文内容：\n{previous_content}")
        if character_notes:
            context_parts.append(f"角色设定：\n{character_notes}")
        if style_guide:
            context_parts.append(f"写作风格：\n{style_guide}")

        context = "\n\n".join(context_parts) if context_parts else None

        prompt = f"请创作章节内容：{chapter_title}"

        return await self.generate(
            prompt=prompt,
            system_prompt=system_prompt,
            context=context,
        )

    async def continue_writing(
        self,
        content: str,
        outline: Optional[str] = None,
        length: str = "medium",  # short, medium, long
    ) -> str:
        """AI 续写"""
        system_prompt = """你是一个专业的 AI 小说创作助手。
请根据已有内容继续创作，保持风格一致，情节连贯。"""

        length_map = {
            "short": "续写 200-300 字",
            "medium": "续写 500-800 字",
            "long": "续写 1000-1500 字",
        }

        prompt = f"""已有内容：
{content}

请继续创作，{length_map.get(length, length_map['medium'])}。保持文风一致，情节自然发展。"""

        return await self.generate(
            prompt=prompt,
            system_prompt=system_prompt,
        )

    async def rewrite(
        self,
        content: str,
        instruction: str,
    ) -> str:
        """AI 改写"""
        system_prompt = """你是一个专业的 AI 小说编辑助手。
请根据用户的要求改写内容，保持原意但改善表达。"""

        prompt = f"""请根据以下要求改写内容：

要求：{instruction}

原内容：
{content}

请输出改写后的内容："""

        return await self.generate(
            prompt=prompt,
            system_prompt=system_prompt,
        )

    async def expand(
        self,
        content: str,
        direction: Optional[str] = None,
    ) -> str:
        """AI 扩写"""
        system_prompt = """你是一个专业的 AI 小说创作助手。
请根据已有内容进行扩写，增加细节描写，使场景更加生动。"""

        prompt = f"""请扩写以下内容，增加细节描写和场景描述：

{content}
"""
        if direction:
            prompt += f"\n扩写方向：{direction}"

        return await self.generate(
            prompt=prompt,
            system_prompt=system_prompt,
        )


# 全局 AI 客户端实例
ai_client: Optional[AIClient] = None


def get_ai_client() -> AIClient:
    """获取 AI 客户端"""
    global ai_client
    if ai_client is None:
        ai_client = AIClient()
    return ai_client


async def init_ai():
    """初始化 AI 客户端"""
    global ai_client
    ai_client = AIClient()
    logger.info(f"AI 客户端初始化完成，模型：{ai_client.model}")


async def close_ai():
    """关闭 AI 客户端"""
    global ai_client
    if ai_client:
        await ai_client.close()
        ai_client = None
