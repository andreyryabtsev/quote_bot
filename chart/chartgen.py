# python3 chartgen.py ./chart/
import sys
import math
import matplotlib.pyplot as plt
import itertools
import random

COLORS = ["#9FDFBF", "#5C92C9", "#4EB270", "#C9C64E", "#BF905C"]

with open(sys.argv[1] + "chartdata") as f:
    content = [l.strip() for l in f.readlines()]
days = int(content[0])
del content[0]
n = len(content) // 2


xs = range(0, days)
ys = [[0] * days for m in range(n)]

for i in range(n):
    for timeAgo in content[i * 2 + 1].split(" "):
        ys[i][days - int(timeAgo) - 1] += 1

c_permuts = list(itertools.permutations(COLORS))
COLORS = c_permuts[random.randint(0, len(c_permuts))]
for p in range(n):
    these_xs = [a + p / n for a in xs]
    plt.bar(these_xs, ys[p], width=(1.0 / n), align="edge", color=COLORS[p % len(COLORS)], label=content[p * 2])
plt.xticks([0, days], [str(days) + " days ago", "today"])
plt.ylabel("Logs")
plt.legend()
plt.title(("Communal" if n > 1 else content[0] + "'s") + " log patterns")

plt.savefig(sys.argv[1] + 'chart.png')