"""
设定服务 - AI 辅助设定生成与一致性检查
"""
from typing import Optional, Dict, Any, List
from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession


class SettingService:
    """设定服务类"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def generate_setting(
        self,
        setting_type: str,
        prompt: str,
        project_settings: Optional[Dict[str, Any]] = None,
        temperature: float = 0.7,
    ) -> str:
        """
        AI 生成设定

        Args:
            setting_type: 设定类型 (world_view, power_system, magic, time_setting, etc.)
            prompt: 生成提示
            project_settings: 项目现有设定，用于保持一致性
            temperature: AI 生成温度

        Returns:
            生成的设定内容
        """
        from utils.ai_client import get_ai_client

        ai = get_ai_client()

        # 构建系统提示
        system_prompts = {
            "world_view": "你是一个专业的奇幻小说世界观设定创作助手。请创作引人入胜、自洽的世界观设定，包括核心理念、基本规则等。",
            "time_setting": "你是一个专业的小说时代背景设定创作助手。请创作详细且合理的时代背景设定。",
            "location_setting": "你是一个专业的小说地理环境创作助手。请创作生动详细的地点设定。",
            "power_system": "你是一个专业的力量体系设计助手。请设计层次分明、规则清晰的力量/修炼体系。",
            "magic": "你是一个专业的魔法/超能力系统设计助手。请创作富有创意且规则自洽的魔法系统。",
            "social_structure": "你是一个专业的社会组织结构设计助手。请创作合理的社会阶层和组织架构。",
            "technology": "你是一个专业的科技文明设定助手。请描述符合世界观的科技发展水平。",
            "culture": "你是一个专业的文化习俗设计助手。请创作丰富多彩的文化传统和习俗。",
            "history": "你是一个专业的历史背景创作助手。请创作扣人心弦的世界历史大事年表。",
            "creatures": "你是一个专业的生物种族设计助手。请创作独特的生物和种族设定。",
        }

        system_prompt = system_prompts.get(
            setting_type,
            "你是一个专业的小说设定创作助手。请创作高质量的设定内容。"
        )

        # 添加现有设定上下文，保持一致性
        context = ""
        if project_settings:
            context_parts = []
            if project_settings.get("worldView"):
                context_parts.append(f"世界观：{project_settings['worldView']}")
            if project_settings.get("powerSystem"):
                context_parts.append(f"力量体系：{project_settings['powerSystem']}")
            if project_settings.get("magic"):
                context_parts.append(f"魔法设定：{project_settings['magic']}")
            if context_parts:
                context = "=== 现有设定 ===\n" + "\n".join(context_parts)

        try:
            content = await ai.generate(
                prompt=prompt,
                system_prompt=system_prompt,
                context=context if context else None,
                temperature=temperature,
            )
            logger.info(f"AI 生成设定成功：{setting_type}")
            return content
        except Exception as e:
            logger.error(f"AI 生成设定失败：{e}")
            raise

    async def generate_setting_stream(
        self,
        setting_type: str,
        prompt: str,
        project_settings: Optional[Dict[str, Any]] = None,
        temperature: float = 0.7,
    ):
        """
        AI 生成设定（流式）

        Args:
            setting_type: 设定类型
            prompt: 生成提示
            project_settings: 项目现有设定
            temperature: AI 生成温度

        Yields:
            生成的文本片段
        """
        from utils.ai_client import get_ai_client

        ai = get_ai_client()

        system_prompts = {
            "world_view": "你是一个专业的奇幻小说世界观设定创作助手。请创作引人入胜、自洽的世界观设定。",
            "time_setting": "你是一个专业的小说时代背景设定创作助手。请创作详细且合理的时代背景设定。",
            "location_setting": "你是一个专业的小说地理环境创作助手。请创作生动详细的地点设定。",
            "power_system": "你是一个专业的力量体系设计助手。请设计层次分明、规则清晰的力量/修炼体系。",
            "magic": "你是一个专业的魔法/超能力系统设计助手。请创作富有创意且规则自洽的魔法系统。",
            "social_structure": "你是一个专业的社会组织结构设计助手。请创作合理的社会阶层和组织架构。",
            "technology": "你是一个专业的科技文明设定助手。请描述符合世界观的科技发展水平。",
            "culture": "你是一个专业的文化习俗设计助手。请创作丰富多彩的文化传统和习俗。",
            "history": "你是一个专业的历史背景创作助手。请创作扣人心弦的世界历史大事年表。",
            "creatures": "你是一个专业的生物种族设计助手。请创作独特的生物和种族设定。",
        }

        system_prompt = system_prompts.get(
            setting_type,
            "你是一个专业的小说设定创作助手。请创作高质量的设定内容。"
        )

        # 添加现有设定上下文
        context = ""
        if project_settings:
            context_parts = []
            if project_settings.get("worldView"):
                context_parts.append(f"世界观：{project_settings['worldView']}")
            if project_settings.get("powerSystem"):
                context_parts.append(f"力量体系：{project_settings['powerSystem']}")
            if project_settings.get("magic"):
                context_parts.append(f"魔法设定：{project_settings['magic']}")
            if context_parts:
                context = "=== 现有设定 ===\n" + "\n".join(context_parts)

        try:
            async for token in ai.generate_stream(
                prompt=prompt,
                system_prompt=system_prompt,
                context=context if context else None,
                temperature=temperature,
            ):
                yield token
            logger.info(f"AI 流式生成设定完成：{setting_type}")
        except Exception as e:
            logger.error(f"AI 流式生成设定失败：{e}")
            raise

    async def check_setting_consistency(
        self,
        project_settings: Dict[str, Any],
        content_to_check: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        检查设定一致性

        Args:
            project_settings: 项目设定
            content_to_check: 待检查的内容（可选，如章节内容）

        Returns:
            一致性检查结果
        """
        from utils.ai_client import get_ai_client

        ai = get_ai_client()

        # 构建检查提示
        setting_parts = []
        for key, value in project_settings.items():
            if value:
                setting_parts.append(f"{key}: {value}")

        if not setting_parts:
            return {
                "consistent": True,
                "issues": [],
                "suggestions": ["暂无设定内容，请先完善世界观设定"]
            }

        settings_text = "\n".join(setting_parts)

        prompt = f"""请检查以下小说设定是否存在内部矛盾或不一致之处：

=== 世界观设定 ===
{settings_text}
"""

        if content_to_check:
            prompt += f"""
=== 待检查内容 ===
{content_to_check}
"""
            prompt += """
请检查：
1. 设定内部是否有逻辑矛盾
2. 待检查内容是否违背世界观设定
3. 时间线、地点、人物关系等是否合理

请以 JSON 格式返回检查结果：
{
    "consistent": true/false,
    "issues": ["问题 1", "问题 2", ...],
    "suggestions": ["建议 1", "建议 2", ...]
}
"""
        else:
            prompt += """
请检查：
1. 各项设定之间是否存在矛盾
2. 设定是否自洽合理
3. 是否有需要补充的设定

请以 JSON 格式返回检查结果：
{
    "consistent": true/false,
    "issues": ["问题 1", "问题 2", ...],
    "suggestions": ["建议 1", "建议 2", ...]
}
"""

        try:
            result_text = await ai.generate(
                prompt=prompt,
                system_prompt="你是一个专业的小说设定审核助手，擅长发现设定中的逻辑矛盾和不一致之处。请客观、细致地检查设定，并给出改进建议。",
                temperature=0.3,  # 较低温度确保分析准确性
            )

            # 尝试解析 JSON 结果
            import json
            try:
                # 提取 JSON 部分（可能包含在代码块中）
                json_start = result_text.find('{')
                json_end = result_text.rfind('}') + 1
                if json_start >= 0 and json_end > json_start:
                    json_str = result_text[json_start:json_end]
                    result = json.loads(json_str)
                else:
                    result = {
                        "consistent": True,
                        "issues": [],
                        "suggestions": [result_text]
                    }
            except json.JSONDecodeError:
                # 解析失败时返回文本结果
                result = {
                    "consistent": True,
                    "issues": [],
                    "suggestions": [result_text]
                }

            logger.info(f"设定一致性检查完成")
            return result
        except Exception as e:
            logger.error(f"设定一致性检查失败：{e}")
            return {
                "consistent": True,
                "issues": [f"检查过程出错：{str(e)}"],
                "suggestions": ["请稍后重试"]
            }

    async def generate_full_worldview(
        self,
        novel_genre: str,
        brief_description: str,
        temperature: float = 0.7,
    ) -> Dict[str, str]:
        """
        根据小说类型和简介生成完整的世界观设定

        Args:
            novel_genre: 小说类型
            brief_description: 小说简介
            temperature: AI 生成温度

        Returns:
            包含各项设定的字典
        """
        from utils.ai_client import get_ai_client

        ai = get_ai_client()

        prompt = f"""请为以下小说创作完整的世界观设定：

小说类型：{novel_genre}
小说简介：{brief_description}

请创作以下设定内容：
1. 世界观（整体世界观和核心理念）
2. 时代设定（故事发生的时代背景）
3. 地点设定（主要故事发生地点）
4. 力量体系（力量等级和规则）
5. 魔法/超能力设定（如有）
6. 社会结构（社会组织和阶层）
7. 科技水平
8. 文化习俗
9. 历史背景（重大历史事件）
10. 生物种族（世界中的主要种族）

请按照以下 JSON 格式返回：
{
    "worldView": "...",
    "timeSetting": "...",
    "locationSetting": "...",
    "powerSystem": "...",
    "magic": "...",
    "socialStructure": "...",
    "technology": "...",
    "culture": "...",
    "history": "...",
    "creatures": "..."
}
"""

        try:
            result_text = await ai.generate(
                prompt=prompt,
                system_prompt="你是一个专业的奇幻小说世界观设定创作助手。请创作引人入胜、自洽完整的世界观设定。",
                temperature=temperature,
            )

            # 解析 JSON 结果
            import json
            try:
                json_start = result_text.find('{')
                json_end = result_text.rfind('}') + 1
                if json_start >= 0 and json_end > json_start:
                    json_str = result_text[json_start:json_end]
                    result = json.loads(json_str)
                else:
                    result = {"worldView": result_text}
            except json.JSONDecodeError:
                result = {"worldView": result_text}

            logger.info("AI 生成完整世界观成功")
            return result
        except Exception as e:
            logger.error(f"AI 生成完整世界观失败：{e}")
            raise
