#!/usr/bin/env bash
# Adds a handful of realistic orders through the running API so there is something to look at.
# Start the API first in another terminal: npm run dev
set -euo pipefail
BASE="${BASE_URL:-http://localhost:3000}"

api() { # api METHOD PATH USER ROLE [JSON]
  curl -fsS -X "$1" "$BASE$2" -H "x-user-id: $3" -H "x-user-role: $4" -H 'content-type: application/json' ${5:+-d "$5"}
}
# Read one field from JSON on stdin, e.g.: field '.items[0].id'
field() { node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(new Function('v','return v'+process.argv[1])(JSON.parse(s))))" "$1"; }
new_order() { api POST /orders "$1" customer "$2" | field .id; }

curl -fsS "$BASE/health" >/dev/null || { echo "The API is not running at $BASE. Start it with: npm run dev" >&2; exit 1; }

echo "Alice: a tent, shipped and delivered"
o=$(new_order cus_alice '{"items":[{"sku":"SKU-TENT-2P","qty":1}]}')
api POST /orders/$o/place cus_alice customer >/dev/null; api POST /orders/$o/pay cus_alice customer >/dev/null
api POST /orders/$o/ship sup_1 support >/dev/null; api POST /orders/$o/deliver sup_1 support >/dev/null

echo "Bob: two stoves with a promo code, paid"
o=$(new_order cus_bob '{"items":[{"sku":"SKU-STOVE-1","qty":2}],"promoCode":"SAVE10"}')
api POST /orders/$o/place cus_bob customer >/dev/null; api POST /orders/$o/pay cus_bob customer >/dev/null

echo "Carol: fuel canisters, placed but not yet paid"
o=$(new_order cus_carol '{"items":[{"sku":"SKU-FUEL-8","qty":3}]}')
api POST /orders/$o/place cus_carol customer >/dev/null

echo "Alice: a bag and two bottles, payment declined"
o=$(new_order cus_alice '{"items":[{"sku":"SKU-BAG-20F","qty":1},{"sku":"SKU-WATER-1","qty":2}]}')
api POST /orders/$o/place cus_alice customer >/dev/null; api POST /orders/$o/pay cus_alice customer >/dev/null

echo "Bob: two pairs of socks, delivered, one pair returned"
o=$(new_order cus_bob '{"items":[{"sku":"SKU-SOCK-L","qty":2}]}')
api POST /orders/$o/place cus_bob customer >/dev/null; api POST /orders/$o/pay cus_bob customer >/dev/null
api POST /orders/$o/ship sup_1 support >/dev/null; api POST /orders/$o/deliver sup_1 support >/dev/null
item=$(api GET /orders/$o cus_bob customer | field '.items[0].id')
api POST /refunds cus_bob customer "{\"orderId\":$o,\"reason\":\"UNOPENED_RETURN\",\"lines\":[{\"orderItemId\":$item,\"qty\":1}]}" >/dev/null

echo "Done. Orders: $(api GET /orders adm_1 admin | field .length)"
