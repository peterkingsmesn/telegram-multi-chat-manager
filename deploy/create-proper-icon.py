from PIL import Image, ImageDraw
import os

# assets 디렉토리 생성
os.makedirs('assets', exist_ok=True)

# 256x256 아이콘 생성
img = Image.new('RGB', (256, 256), color='#0088cc')
draw = ImageDraw.Draw(img)

# 간단한 텔레그램 스타일 종이비행기 그리기
points = [
    (50, 128),   # 왼쪽 끝
    (206, 80),   # 오른쪽 위
    (230, 176),  # 오른쪽 아래
    (128, 140),  # 중앙
]
draw.polygon(points, fill='white')

# 그림자 효과
shadow_points = [
    (128, 140),
    (206, 80),
    (180, 160),
]
draw.polygon(shadow_points, fill='#cccccc')

# PNG로 저장
img.save('assets/icon.png')

# ICO 파일 생성 (여러 크기 포함)
icon_sizes = [(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
img.save('assets/icon.ico', format='ICO', sizes=icon_sizes)

# Linux용 아이콘
img.save('assets/icon-linux.png')

print("아이콘 파일이 생성되었습니다:")
print("- assets/icon.png (256x256)")
print("- assets/icon.ico (multi-size)")
print("- assets/icon-linux.png (256x256)")