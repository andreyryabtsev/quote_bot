import numpy as np
import pickle
import re
import sys


def prepare_data(data_path, file_name):
    print("Reading file...")
    with open(f"{data_path}/{file_name}") as f:
        data = f.read()

    print("Replacing spaces...")
    data = re.sub(r'\s+', ' ', data)

    voc2ind = {}
    c = 0

    print("Computing voc2ind...")
    # Compute voc2ind and transform the data into an integer representation of the tokens.
    for char in data:
        if char not in voc2ind:
            voc2ind[char] = c
            c += 1

    print("Computing ind2voc...")
    ind2voc = {val: key for key, val in voc2ind.items()}

    s = int(len(data) * 0.8)
    train_text = np.array([voc2ind[c] for c in data[:s]])
    test_text = np.array([voc2ind[c] for c in data[s:]])

    print("Saving...")
    pickle.dump({'tokens': train_text, 'ind2voc': ind2voc, 'voc2ind': voc2ind},
                open(data_path + 'chars_train.pkl', 'wb'))
    pickle.dump({'tokens': test_text, 'ind2voc': ind2voc, 'voc2ind': voc2ind}, open(data_path + 'chars_test.pkl', 'wb'))


if len(sys.argv) != 2:
    print("Usage: python char_prepare.py path/to/source.txt")
    exit(1)

path, _, file = sys.argv[1].rpartition("/")

prepare_data(path, file)
