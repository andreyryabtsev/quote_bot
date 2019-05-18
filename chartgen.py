# python3 chargen.py day_count 12412_now_12414 stamp1,stamp2,stamp3 Tenghis
import sys
import math
import matplotlib.pyplot as plt
import itertools
import random

COLORS = ["#9FDFBF", "#5C92C9", "#4EB270", "#C9C64E", "#BF905C"]
days = int(sys.argv[1])
people = int(sys.argv[2])
curtime = int(sys.argv[3])
data = [[int(a) for a in sys.argv[k].split(",")] for k in range(4, 4 + people)]
names = sys.argv[(4 + people):(4 + 2 * people)]
print("started image script: " + str(days) + " days, @" + str(curtime) + " for " + ",".join(names))

# Preprocess data:
millisInDay = 1000 * 60 * 60 * 24
xs = range(0, days)
ys = [[0] * days for m in range(0, people)]
for p in range(people):
    for i in range(len(data[p])):
        days_ago = math.floor((curtime - data[p][i]) / millisInDay)
        #print("p = " + str(p) + ", days_ago = " + str(days_ago))
        if days_ago >= 0 and days_ago < days:
            ys[p][days - days_ago - 1] += 1

#Chart data:
c_permuts = list(itertools.permutations(COLORS))
COLORS = c_permuts[random.randint(0, len(c_permuts))]
print(data)
print(xs)
print(ys)
for p in range(people):
    these_xs = [a + p / people for a in xs]
    plt.bar(these_xs, ys[p], width=(1.0 / people), align="edge", color=COLORS[p % len(COLORS)], label=names[p])
plt.xticks([0, days], [str(days) + " days ago", "today"])
plt.ylabel("Logs")
plt.legend()
plt.title(("Communal" if people > 1 else names[0] + "'s") + " log patterns")

plt.savefig('chart.png')
print("saved figure")
#        0           1      2     3             4                           5                                         6              7
#python3 chartgen.py N_DAYS N_PPL 1551738363326 1546480587271,1547280264963 1546480587271,1546480687271,1547280264963 'daddys bread' 'mommys bread'
#python3 chartgen.py 30 2 1548738363326 1546480587271,1547280264963 1546480587271,1546480687271,1547280264963 'daddys bread' 'mommys bread'