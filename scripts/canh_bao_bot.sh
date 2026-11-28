#!/usr/bin/env bash
# Cảnh báo bot qua GitHub issue (GitHub gửi email cho chủ repo nhờ @PhuocRin).
# Cách dùng:
#   canh_bao_bot.sh loi "<tên bot>"            -> bot vừa chạy lỗi: mở issue (nếu chưa có)
#   canh_bao_bot.sh on  "<tên bot>"            -> bot chạy lại bình thường: đóng issue lỗi đang mở
#   canh_bao_bot.sh canh <workflow.yml> <giờ chạy bù> <giờ báo> "<tên bot>"
#       -> bot kia quá <giờ chạy bù> chưa chạy thành công thì tự bấm chạy nó (GitHub hay bỏ lịch);
#          quá <giờ báo> mới mở issue gửi mail cho Phước
set -u
REPO="${GITHUB_REPOSITORY}"
LABEL="bot-loi"
RUN_URL="${GITHUB_SERVER_URL:-https://github.com}/${REPO}/actions/runs/${GITHUB_RUN_ID:-}"
gh label create "$LABEL" --repo "$REPO" --color d93f0b --description "Bot của web gặp vấn đề" --force >/dev/null 2>&1 || true

open_issue() { # $1 tiêu đề, $2 nội dung
  if gh issue list --repo "$REPO" --label "$LABEL" --state open --search "\"$1\" in:title" --json number --jq 'length' | grep -qv '^0$'; then
    echo "Đã có issue đang mở: $1"; return 0
  fi
  printf '%s\n\n@PhuocRin\n' "$2" | gh issue create --repo "$REPO" --title "$1" --label "$LABEL" --body-file -
}

case "${1:-}" in
  loi)
    open_issue "Bot $2 bị lỗi" "Lần chạy gần nhất của bot $2 bị lỗi, nên trang web có thể chưa được cập nhật.

Xem chi tiết: $RUN_URL

Ní nhắn Claude kèm link trên để xem và sửa. Bot vẫn tự chạy lại theo lịch, chạy được là mục này tự đóng."
    ;;
  on)
    for n in $(gh issue list --repo "$REPO" --label "$LABEL" --state open --search "\"Bot $2\" in:title" --json number --jq '.[].number'); do
      gh issue close "$n" --repo "$REPO" --comment "Bot $2 đã chạy lại bình thường: $RUN_URL"
    done
    ;;
  canh)
    wf="$2"; bu="$3"; bao="$4"; ten="$5"
    last=$(gh api "repos/$REPO/actions/workflows/$wf/runs?status=success&per_page=1" --jq '.workflow_runs[0].updated_at // empty')
    if [ -z "$last" ]; then echo "Chưa có lần chạy nào"; exit 0; fi
    age=$(( ( $(date -u +%s) - $(date -u -d "$last" +%s) ) / 3600 ))
    echo "Bot $ten chạy thành công lần cuối $age giờ trước"
    if [ "$age" -ge "$bu" ]; then
      dang=$(gh api "repos/$REPO/actions/workflows/$wf/runs?per_page=5" --jq '[.workflow_runs[]|select(.status!="completed")]|length')
      if [ "$dang" = "0" ]; then
        gh workflow run "$wf" --repo "$REPO" --ref main && echo "Đã bấm chạy bù bot $ten"
      else
        echo "Bot $ten đang chạy hoặc đang chờ, không bấm thêm"
      fi
    fi
    if [ "$age" -ge "$bao" ]; then
      open_issue "Bot $ten ngưng chạy" "Bot $ten đã $age giờ chưa chạy thành công lần nào (lần cuối: $last UTC), dù bot kia đã tự bấm chạy bù. Trang web có thể đang hiện dữ liệu cũ.

Xem các lần chạy: ${GITHUB_SERVER_URL:-https://github.com}/$REPO/actions/workflows/$wf

Ní nhắn Claude kèm link trên để xem và sửa."
    else
      # chạy lại được rồi thì đóng issue "ngưng chạy" cũ nếu còn
      for n in $(gh issue list --repo "$REPO" --label "$LABEL" --state open --search "\"Bot $ten ngưng chạy\" in:title" --json number --jq '.[].number'); do
        gh issue close "$n" --repo "$REPO" --comment "Bot $ten đã chạy lại (lần cuối $age giờ trước)."
      done
    fi
    ;;
esac
