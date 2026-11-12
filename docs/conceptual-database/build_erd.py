"""Builds conceptual_database.svg, the crow's foot conceptual ERD of the SUGO system.

Entities and cardinalities come from the Prisma schema at
Capstone_Server/server/prisma/schema.prisma. Run with `py build_erd.py`.
"""
from pathlib import Path

W, H = 1800, 1040
# Everything is laid out on the original grid, then shifted up into the trimmed canvas.
SHIFT_Y = -110
INK = "#000"
MUTED = "#000"
BOX_W, BOX_H = 170, 70

# (name, x, y, weak) — weak entities get the double border.
ENTITIES = {
    "customer":   ("Customer", 380, 540, False),
    "saved":      ("Saved\nLocation", 120, 540, True),
    "feedback":   ("Feedback", 380, 720, False),
    "payment":    ("Payment", 640, 180, True),
    "dispatcher": ("Dispatcher", 900, 180, False),
    "proof":      ("Proof Image", 380, 360, True),
    "mode":       ("Payment\nMode", 1160, 360, False),
    "rate":       ("Rate\nConfiguration", 1160, 180, False),
    "owner":      ("Owner", 1420, 180, False),
    "review":     ("Exception\nReview", 1420, 360, True),
    "category":   ("Merchant\nCategory", 1680, 360, False),
    "stop":       ("Store Stop", 1420, 540, True),
    "store":      ("Store", 1680, 540, False),
    "item":       ("Errand Item", 1420, 720, True),
    "rating":     ("Rating", 640, 720, True),
    "commission": ("Rider\nCommission", 1160, 720, True),
    "rider":      ("Rider", 900, 900, False),
    "settlement": ("Settlement", 900, 1080, True),
    "adjustment": ("Settlement\nAdjustment", 1160, 1080, True),
}

# Errand is the associative entity (box with a diamond), as in the reference.
ERRAND = (900, 540, 240, 130)

# (points from end A to end B, marker at A, marker at B, label, label position or None)
# Markers: one = exactly one, zone = zero or one, many = one or many, zmany = zero or many.
EDGES = [
    ([(465, 555), (780, 555)], "one", "zmany", "Places", (622, 555)),
    ([(295, 540), (205, 540)], "one", "zmany", "Saves", (250, 520)),
    ([(380, 575), (380, 685)], "zone", "zmany", "Submits", None),
    ([(780, 490), (640, 490), (640, 215)], "one", "zmany", "Includes", (640, 350)),
    ([(815, 180), (725, 180)], "zone", "zmany", "Confirms", (770, 158)),
    ([(380, 325), (380, 180), (555, 180)], "zone", "zone", "Proves", (470, 180)),
    ([(780, 520), (540, 520), (540, 360), (465, 360)], "one", "zmany", "Has", (540, 430)),
    ([(900, 215), (900, 475)], "zmany", "zmany", "Dispatches", (900, 345)),
    ([(1075, 360), (960, 360), (960, 475)], "zone", "zmany", "Pays", (1010, 360)),
    ([(1020, 490), (1290, 490), (1290, 360), (1335, 360)], "one", "zmany", "Flagged in", (1180, 490)),
    ([(1420, 215), (1420, 325)], "one", "zmany", "Reviews", None),
    ([(1335, 180), (1245, 180)], "one", "one", "Sets", (1290, 158)),
    ([(1505, 180), (1680, 180), (1680, 325)], "one", "zmany", "Manages", (1590, 180)),
    ([(1020, 540), (1335, 540)], "one", "zmany", "Visits", (1200, 540)),
    ([(1595, 540), (1505, 540)], "zone", "zmany", "Pinned as", (1550, 518)),
    ([(1680, 395), (1680, 505)], "one", "zmany", "Classifies", None),
    ([(1020, 590), (1290, 590), (1290, 720), (1335, 720)], "one", "many", "Consists of", (1180, 590)),
    ([(1420, 575), (1420, 685)], "zone", "zmany", "Buys", None),
    ([(840, 605), (840, 720), (725, 720)], "one", "zone", "Receives", (840, 662)),
    ([(815, 900), (640, 900), (640, 755)], "one", "zmany", "Is rated in", (728, 900)),
    ([(900, 865), (900, 605)], "zone", "zmany", "Delivers", (900, 735)),
    ([(960, 605), (960, 720), (1075, 720)], "one", "zone", "Earns", (960, 662)),
    ([(985, 900), (1160, 900), (1160, 755)], "one", "zmany", "Receives", (1072, 900)),
    ([(780, 585), (500, 585), (500, 1080), (815, 1080)], "one", "zone", "Settled by", (500, 830)),
    ([(900, 935), (900, 1045)], "one", "zmany", "Remits", None),
    ([(985, 1080), (1075, 1080)], "one", "zmany", "Has", (1030, 1058)),
]

out = []


def add(s):
    out.append(s)


def text_lines(x, y, label, size, weight=600, color=INK):
    lines = label.split("\n")
    lead = size * 1.2
    top = y - lead * (len(lines) - 1) / 2
    for i, line in enumerate(lines):
        add(f'<text x="{x}" y="{top + i * lead:.1f}" font-size="{size}" font-weight="{weight}" '
            f'fill="{color}" text-anchor="middle" dominant-baseline="central">{line}</text>')


def entity(label, x, y, weak):
    l, t = x - BOX_W / 2, y - BOX_H / 2
    add(f'<rect x="{l}" y="{t}" width="{BOX_W}" height="{BOX_H}" rx="6" fill="#fff" stroke="{INK}" stroke-width="2"/>')
    if weak:
        add(f'<rect x="{l + 6}" y="{t + 6}" width="{BOX_W - 12}" height="{BOX_H - 12}" rx="3" fill="none" stroke="{INK}" stroke-width="1.5"/>')
    text_lines(x, y, label, 16)


def associative(label, x, y, w, h):
    add(f'<rect x="{x - w / 2}" y="{y - h / 2}" width="{w}" height="{h}" rx="6" fill="#fff" stroke="{INK}" stroke-width="2"/>')
    dw, dh = w / 2 - 14, h / 2 - 10
    add(f'<polygon points="{x},{y - dh} {x + dw},{y} {x},{y + dh} {x - dw},{y}" fill="#fff" stroke="{INK}" stroke-width="2"/>')
    text_lines(x, y, label, 19, 700)


def seg(a, b, sw=1.8):
    add(f'<line x1="{a[0]:.1f}" y1="{a[1]:.1f}" x2="{b[0]:.1f}" y2="{b[1]:.1f}" stroke="{INK}" stroke-width="{sw}"/>')


def marker(p, toward_box, kind):
    """p sits on the box edge; toward_box points from the line into the box."""
    dx, dy = toward_box
    nx, ny = -dy, dx

    def at(back, side=0):
        return (p[0] - dx * back + nx * side, p[1] - dy * back + ny * side)

    def bar(back):
        seg(at(back, -9), at(back, 9), 2)

    def circle(back):
        c = at(back)
        add(f'<circle cx="{c[0]:.1f}" cy="{c[1]:.1f}" r="6" fill="#fff" stroke="{INK}" stroke-width="2"/>')

    def crow():
        root = at(17)
        for side in (-10, 0, 10):
            seg(root, at(0, side), 2)

    if kind == "one":
        bar(9); bar(17)
    elif kind == "zone":
        bar(9); circle(23)
    elif kind == "many":
        crow(); bar(23)
    elif kind == "zmany":
        crow(); circle(26)


def unit(a, b):
    dx, dy = b[0] - a[0], b[1] - a[1]
    n = (dx * dx + dy * dy) ** 0.5
    return dx / n, dy / n


def label_at(x, y, label):
    w = len(label) * 7.6 + 12
    add(f'<rect x="{x - w / 2:.1f}" y="{y - 11}" width="{w:.1f}" height="22" fill="#fff"/>')
    add(f'<text x="{x}" y="{y}" font-size="14" font-weight="600" fill="{MUTED}" '
        f'text-anchor="middle" dominant-baseline="central">{label}</text>')


def edge(points, ma, mb, label, pos):
    for a, b in zip(points, points[1:]):
        seg(a, b)
    marker(points[0], unit(points[1], points[0]), ma)
    marker(points[-1], unit(points[-2], points[-1]), mb)
    if pos is None:
        a, b = max(zip(points, points[1:]), key=lambda s: abs(s[0][0] - s[1][0]) + abs(s[0][1] - s[1][1]))
        pos = ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
    label_at(pos[0], pos[1], label)


add(f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" '
    f'font-family="Segoe UI, Arial, Helvetica, sans-serif">')
add(f'<rect width="{W}" height="{H}" fill="#fff"/>')
add(f'<g transform="translate(0,{SHIFT_Y})">')

for points, ma, mb, label, pos in EDGES:
    edge(points, ma, mb, label, pos)
for label, x, y, weak in ENTITIES.values():
    entity(label, x, y, weak)
associative("Errand", *ERRAND)
add("</g>")
add("</svg>")

Path(__file__).with_name("conceptual_database.svg").write_text("\n".join(out), encoding="utf-8")
print("wrote conceptual_database.svg")
