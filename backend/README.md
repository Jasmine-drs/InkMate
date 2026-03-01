# 环境变量
cp .env.example .env

# 激活虚拟环境
source venv/Scripts/activate

# 安装依赖
pip install -r requirements.txt

# 启动服务
uvicorn main:app --reload --host 0.0.0.0 --port 8000
