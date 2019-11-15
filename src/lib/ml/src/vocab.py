import pickle
import torch
from shared import PUNCTUATION, to_words


class WordVocabulary(object):
    def __init__(self, data_file):
        with open(data_file, 'rb') as data_file:
            dataset = pickle.load(data_file)
        self.ind2voc = dataset['ind2voc']
        self.voc2ind = dataset['voc2ind']
        print(f"Initialized word vocabulary, {len(self.ind2voc)} tokens.")

    # Returns a string representation of the tokens.
    def array_to_words(self, arr):
        out = ""
        for ind in arr:
            voc = self.ind2voc[int(ind)]
            if out != "" and voc not in PUNCTUATION:
                voc = " " + voc
            # else:
            #     print(f"skipping punctuation on {voc}")
            out += voc
        return out

    # Returns a torch tensor representing each token in words.
    def words_to_array(self, words):
        return torch.LongTensor([self.voc2ind[word] for word in to_words(words)])

    # Returns the size of the vocabulary.
    def __len__(self):
        return len(self.voc2ind)


class Vocabulary(object):
    def __init__(self, data_file):
        with open(data_file, 'rb') as data_file:
            dataset = pickle.load(data_file)
        self.ind2voc = dataset['ind2voc']
        self.voc2ind = dataset['voc2ind']

    # Returns a string representation of the tokens.
    def array_to_words(self, arr):
        return ''.join([self.ind2voc[int(ind)] for ind in arr])

    # Returns a torch tensor representing each token in words.
    def words_to_array(self, words):
        return torch.LongTensor([self.voc2ind[word] for word in words])

    # Returns the size of the vocabulary.
    def __len__(self):
        return len(self.voc2ind)
