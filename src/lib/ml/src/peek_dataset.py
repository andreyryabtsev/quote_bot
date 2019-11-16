import numpy as np
import pt_util
import torch
import tqdm
import math

from language_sampler import LanguageSampler
from dataset import NLTextDataset
from model import LanguageModel
from vocab import WordVocabulary


def repackage_hidden(h):
    """Wraps hidden states in new Tensors, to detach them from their history."""
    if isinstance(h, torch.Tensor):
        return h.detach()
    else:
        return tuple(repackage_hidden(v) for v in h)


def train(model, device, optimizer, train_loader, lr, epoch, log_interval):
    model.train()
    losses = []
    hidden = None
    for batch_idx, (data, label) in enumerate(tqdm.tqdm(train_loader)):
        data, label = data.to(device), label.to(device)
        # Separates the hidden state across batches.
        # Otherwise the backward would try to go all the way to the beginning every time.
        if hidden is not None:
            hidden = repackage_hidden(hidden)
        optimizer.zero_grad()
        output, hidden = model(data)
        pred = output.max(-1)[1]
        loss = model.loss(output, label)
        losses.append(loss.item())
        loss.backward()
        optimizer.step()
        if batch_idx % log_interval == 0:
            print('Train Epoch: {} [{}/{} ({:.0f}%)]\tLoss: {:.6f}'.format(
                epoch, batch_idx * len(data), len(train_loader.dataset),
                       100. * batch_idx / len(train_loader), loss.item()))
    return np.mean(losses)


def main():
    data_train = NLTextDataset(DATA_PATH + 'words_train.pkl', SEQUENCE_LENGTH, BATCH_SIZE, vc=WordVocabulary)
    vocab = data_train.vocab

    for data, label in data_train:
        array = [data[i].item() for i in range(data.size(0))]
        string = vocab.array_to_words(array)
        print(string)


DATA_PATH = "/media/andrey/Elements2/bot_data/"

SEQUENCE_LENGTH = 30
BATCH_SIZE = 64
FEATURE_SIZE = 1024
TEST_BATCH_SIZE = 1024
EPOCHS = 8
LEARNING_RATE = 0.002
WEIGHT_DECAY = 0.0005
USE_CUDA = True
PRINT_INTERVAL = 1000
LOG_PATH = DATA_PATH + 'logs/log.pkl'

main()
