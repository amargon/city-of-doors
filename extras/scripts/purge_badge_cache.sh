# PURGE PROXY CACHE FOR THE CROWDIN BADGE -------------------------------------
# Crowdin badge doesn't have proper cache-control headers,
# so GitHub proxy caches it for one year.

IMAGE_URL="https://camo.githubusercontent.com/6a9cbf9e933ad265c4f3f643a7749abcb2be788b/68747470733a2f2f64333232637174353834626f346f2e636c6f756466726f6e742e6e65742f6d61702d6f662d736967696c2f6c6f63616c697a65642e737667"

curl -X PURGE $IMAGE_URL
