import pickle
import torch
import torch.utils.data
from vocab import Vocabulary


class NLTextDataset(torch.utils.data.Dataset):
    def __init__(self, data_file, sequence_length, batch_size, vc=Vocabulary):
        super(NLTextDataset, self).__init__()

        self.sequence_length = sequence_length
        self.batch_size = batch_size
        self.vocab = vc(data_file)

        with open(data_file, 'rb') as data_pkl:
            dataset = pickle.load(data_pkl)

        self.data = dataset

        self.n = len(self.data["tokens"]) // self.sequence_length // self.batch_size * self.batch_size

    def __len__(self):
        return self.n

    def __getitem__(self, idx):
        # Return the data and label for a character sequence as described above.
        # The data and labels should be torch long tensors.
        # You should return a single entry for the batch using the idx to decide which chunk you are
        # in and how far down in the chunk you are.

        chunk = idx % self.batch_size
        i = chunk * len(self.data["tokens"]) // self.batch_size + idx // self.batch_size * self.sequence_length
        data = torch.from_numpy(self.data["tokens"][i:i + self.sequence_length + 1])
        return data[:-1], data[1:]

    def vocab_size(self):
        return len(self.vocab)
