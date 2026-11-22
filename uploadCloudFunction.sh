#!/usr/bin/env bash
# 部署单个云函数到指定云开发环境（走 CloudBase CLI）
# 用法: ./uploadCloudFunction.sh <云函数名> <环境ID> [项目根目录]
# 例:   ./uploadCloudFunction.sh legalSearch cloud1-5g88rmqa7bde7156 .
set -euo pipefail

FUNC="${1:?请提供云函数名}"
ENV_ID="${2:?请提供云开发环境 ID}"
PROJECT_PATH="${3:-.}"

cloud functions deploy --e "$ENV_ID" --n "$FUNC" --r --project "$PROJECT_PATH"
