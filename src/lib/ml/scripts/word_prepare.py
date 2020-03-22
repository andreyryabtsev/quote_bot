import numpy as np
import os
import pickle
import re
import sys


sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from shared import PUNCTUATION, to_words


def prepare_data_words(data_path, file_name):
    print("Reading file...")
    with open(f"{data_path}/{file_name}") as f:
        data = f.read()

    print("Replacing spaces...")
    data = re.sub(r'\s+', ' ', data)

    counts = {}
    print("Splitting to words...")
    data = to_words(data)
    print(f"Computing counts ({len(data)} input tokens)")
    # Compute voc2ind and transform the data into an integer representation of the tokens.
    for word in data:
        if word not in counts:
            counts[word] = 0
        counts[word] += 1

    print(f"Filtering ({len(counts)} unique tokens)")

    voc2ind = {}
    to_delete = []  # key for key in counts if counts[key] < 3]
    for k in to_delete: del counts[k]

    voc2ind = {k: i for i, (k, v) in zip(range(len(counts)), counts.items())}
    for word in ["<unknown>"] + PUNCTUATION:
        if word not in voc2ind:
            voc2ind[word] = len(voc2ind)

    print(f"Computing ind2voc  ({len(voc2ind)} filtered tokens)")
    ind2voc = {val: key for key, val in voc2ind.items()}

    print(f"Spllitting into")
    s = int(len(data) * 0.8)
    idx_unknown = voc2ind["<unknown>"]
    train_text = np.array([voc2ind[c] if c in voc2ind else idx_unknown for c in data[:s] if
                           c != " "])  # this is slow. TODO optimize if not lazy
    test_text = np.array([voc2ind[c] if c in voc2ind else idx_unknown for c in data[s:] if c != " "])

    print("Saving...")
    pickle.dump({'tokens': train_text, 'ind2voc': ind2voc, 'voc2ind': voc2ind},
                open(data_path + '/words_train.pkl', 'wb'))
    pickle.dump({'tokens': test_text, 'ind2voc': ind2voc, 'voc2ind': voc2ind}, open(data_path + '/words_test.pkl', 'wb'))


# prepare_data_words(DATA_PATH + 'harry_potter.txt')
# prepare_data_words("/gdrive/My Drive/colab_files/reddit_100000_filtered.txt")
# prepare_data_words("/gdrive/My Drive/colab_files/amazonBookReviews_20000.txt")
# /media/andrey/Elements2/bot_data/amazonBookReviews_20000.txt

if len(sys.argv) != 2:
    print("Usage: python char_prepare.py path/to/source.txt")
    exit(1)

path, _, file = sys.argv[1].rpartition("/")

prepare_data_words(path, file)
