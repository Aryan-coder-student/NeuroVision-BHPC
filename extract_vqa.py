import os
from datasets import load_from_disk

data_dir = r"f:\D Drive\NeuroVision\old\NeuroVision-BHPC-VQA\data\bronze\test"
try:
    dataset = load_from_disk(data_dir)
    item = dataset[0]
    # 'image' column could be PIL.Image
    img = item['image']
    img_path = r"f:\D Drive\NeuroVision\old\NeuroVision-Platform\public\data\vqa_demo.jpg"
    os.makedirs(os.path.dirname(img_path), exist_ok=True)
    img.convert('RGB').save(img_path)
    print("Saved image to", img_path)
    print("Question:", item.get('question'))
    print("Answer:", item.get('answer'))
except Exception as e:
    print("Error:", e)
