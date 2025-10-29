import requests

url = "https://0k3yewd8c6.execute-api.ap-northeast-1.amazonaws.com/prod/products"
all_products = []
next_token = None

while True:
    params = {"limit": 100}
    if next_token:
        params["nextToken"] = next_token
    
    response = requests.get(url, params=params)
    data = response.json()
    
    all_products.extend(data.get("products", []))
    next_token = data.get("nextToken")
    
    if not next_token:
        break

print(f"✅ 全製品数: {len(all_products)}")
brands = {}
for product in all_products:
    brand = product.get("brand", "不明")
    brands[brand] = brands.get(brand, 0) + 1

for brand in sorted(brands.keys()):
    print(f"  {brand}: {brands[brand]}個")
