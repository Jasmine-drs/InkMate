"""
AI 服务客户端 - OpenAI API 集成
"""
import json
from typing import AsyncGenerator, Optional, Dict, Any, List
from loguru import logger

try:
    from openai import AsyncOpenAI
except ImportError:
    AsyncOpenAI = None

from config import settings


class AIClient:
    """AI 客户端 - 使用官方 OpenAI SDK"""

    def __init__(self):
        self.api_key = settings.OPENAI_API_KEY
        self.base_url = settings.OPENAI_BASE_URL or "https://api.openai.com/v1"
        self.model = settings.GENERATION_MODEL
        self.max_tokens = settings.MAX_TOKENS
        self.temperature = settings.TEMPERATURE
        self._client: Optional[AsyncOpenAI] = None

    async def _get_client(self) -> AsyncOpenAI:
        """获取 OpenAI 客户端"""
        if self._client is None:
            if AsyncOpenAI is None:
                raise ImportError("请安装 openai 库：pip install openai")

            self._client = AsyncOpenAI(
                api_key=self.api_key,
                base_url=self.base_url,
            )
        return self._client

    async def close(self):
        """关闭客户端"""
        if self._client:
            await self._client.close()
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

        try:
            response = await client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=temperature or self.temperature,
                max_tokens=max_tokens or self.max_tokens,
            )
            return response.choices[0].message.content
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

        try:
            stream = await client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=temperature or self.temperature,
                max_tokens=self.max_tokens,
                stream=True,
            )

            async for chunk in stream:
                if chunk.choices and chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
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
        """AI 续写（非流式）"""
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

    async def continue_writing_stream(
        self,
        content: str,
        outline: Optional[str] = None,
        length: str = "medium",  # short, medium, long
        settings: Optional[dict] = None,  # 世界观设定
        characters: Optional[str] = None,  # 角色信息
    ) -> AsyncGenerator[str, None]:
        """AI 续写（流式）"""
        if not self.api_key:
            logger.warning("未配置 OPENAI_API_KEY，返回空字符串")
            yield ""
            return

        # 构建系统提示
        system_parts = ["你是一个专业的 AI 小说创作助手。"]

        # 添加世界观设定到系统提示
        if settings:
            setting_parts = []
            if settings.get('worldView'):
                setting_parts.append(f"世界观：{settings['worldView']}")
            if settings.get('powerSystem'):
                setting_parts.append(f"力量体系：{settings['powerSystem']}")
            if settings.get('magic'):
                setting_parts.append(f"魔法设定：{settings['magic']}")
            if setting_parts:
                system_parts.append("\n=== 世界观设定 ===\n" + "\n".join(setting_parts))

        # 添加角色信息
        if characters:
            system_parts.append(f"\n=== 角色信息 ===\n{characters}")

        system_parts.append("\n请根据已有内容和设定继续创作，保持风格一致，情节连贯，符合世界观设定。")
        system_prompt = "".join(system_parts)

        length_map = {
            "short": "续写 200-300 字",
            "medium": "续写 500-800 字",
            "long": "续写 1000-1500 字",
        }

        # 构建用户提示
        prompt_parts = [f"已有内容：\n{content}"]

        if outline:
            prompt_parts.append(f"\n本章大纲：\n{outline}")

        prompt_parts.append(f"\n请继续创作，{length_map.get(length, length_map['medium'])}。保持文风一致，情节自然发展。")

        prompt = "\n".join(prompt_parts)

        client = await self._get_client()
        messages = self._build_chat_prompt(system_prompt, prompt)

        try:
            stream = await client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=self.temperature,
                max_tokens=self.max_tokens,
                stream=True,
            )

            async for chunk in stream:
                if chunk.choices and chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
        except Exception as e:
            logger.error(f"AI 续写流式失败：{e}")
            raise

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
