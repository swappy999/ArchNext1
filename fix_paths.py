import glob

for f in glob.glob('backend/**/*.py', recursive=True):
    with open(f, 'r', encoding='utf-8') as file:
        content = file.read()
    
    new_content = content.replace('../../contract_abi.json', '../../../shared/abis/contract_abi.json')
    new_content = new_content.replace('../../marketplace_abi.json', '../../../shared/abis/marketplace_abi.json')
    new_content = new_content.replace('../../property_nft_abi.json', '../../../shared/abis/property_nft_abi.json')
    new_content = new_content.replace('../property_nft_abi.json', '../../shared/abis/property_nft_abi.json')
    new_content = new_content.replace('../marketplace_abi.json', '../../shared/abis/marketplace_abi.json')
    new_content = new_content.replace('"property_nft_abi.json"', '"../shared/abis/property_nft_abi.json"')
    new_content = new_content.replace('"marketplace_abi.json"', '"../shared/abis/marketplace_abi.json"')

    if new_content != content:
        with open(f, 'w', encoding='utf-8') as file:
            file.write(new_content)
        print(f"Updated paths in {f}")
