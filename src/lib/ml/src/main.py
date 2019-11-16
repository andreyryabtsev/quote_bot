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


def test(model, device, test_loader):
    model.eval()
    test_loss = 0
    correct = 0

    with torch.no_grad():
        hidden = None
        for batch_idx, (data, label) in enumerate(test_loader):
            data, label = data.to(device), label.to(device)
            output, hidden = model(data, hidden)
            test_loss += model.loss(output, label, reduction='mean').item()
            pred = output.max(-1)[1]
            correct_mask = pred.eq(label.view_as(pred))
            num_correct = correct_mask.sum().item()
            correct += num_correct
            # Comment this out to avoid printing test results
            if batch_idx % 10 == 0:
                print('Input\t%s\nGT\t%s\npred\t%s\n\n' % (
                    test_loader.dataset.vocab.array_to_words(data[0]),
                    test_loader.dataset.vocab.array_to_words(label[0]),
                    test_loader.dataset.vocab.array_to_words(pred[0])))

    test_loss /= len(test_loader)
    test_accuracy = 100. * correct / (len(test_loader.dataset) * test_loader.dataset.sequence_length)

    print('\nTest set: Average loss: {:.4f}, Accuracy: {}/{} ({:.0f}%)\n'.format(
        test_loss, correct, len(test_loader.dataset) * test_loader.dataset.sequence_length,
                            100. * correct / (len(test_loader.dataset) * test_loader.dataset.sequence_length)))
    return test_loss, test_accuracy


def main():
    data_train = NLTextDataset(DATA_PATH + 'words_train.pkl', SEQUENCE_LENGTH, BATCH_SIZE, vc=WordVocabulary)
    data_test = NLTextDataset(DATA_PATH + 'words_test.pkl', SEQUENCE_LENGTH, TEST_BATCH_SIZE, vc=WordVocabulary)
    vocab = data_train.vocab

    use_cuda = USE_CUDA and torch.cuda.is_available()

    device = torch.device("cuda" if use_cuda else "cpu")
    print('Using device', device)
    import multiprocessing
    num_workers = multiprocessing.cpu_count()
    print('num workers:', num_workers)

    kwargs = {'num_workers': num_workers,
              'pin_memory': True} if use_cuda else {}

    train_loader = torch.utils.data.DataLoader(data_train, batch_size=BATCH_SIZE,
                                               shuffle=False, **kwargs)
    test_loader = torch.utils.data.DataLoader(data_test, batch_size=TEST_BATCH_SIZE,
                                              shuffle=False, **kwargs)

    model = LanguageModel(data_train.vocab_size(), FEATURE_SIZE).to(device)
    # model = TransformerNet().to(device)

    # TEMP
    # seed_words = 'Harry Potter, Voldemort, and Dumbledore walk into a bar. '
    # generated_sentence = generate_language(model, device, seed_words, 200, vocab, 'beam')

    # Adam is an optimizer like SGD but a bit fancier. It tends to work faster and better than SGD.
    # We will talk more about different optimization methods in class.
    def make_optimizer(a): return torch.optim.Adam(model.parameters(), lr=a, weight_decay=WEIGHT_DECAY)
    optimizer = make_optimizer(LEARNING_RATE)
    sampler = LanguageSampler(1.5, 10)
    start_epoch = model.load_last_model(DATA_PATH + 'checkpoints')

    train_losses, test_losses, train_perplexities, test_perplexities, test_accuracies = pt_util.read_log(LOG_PATH, (
    [], [], [], [], []))
    test_loss, test_accuracy = test(model, device, test_loader)

    try:
        for epoch in range(start_epoch, EPOCHS + 1):
            lr = LEARNING_RATE * np.power(LR_DECAY_FACTOR, (int(epoch / LR_DECAY_EVERY)))
            optimizer = make_optimizer(lr)
            train_loss = train(model, device, optimizer, train_loader, lr, epoch, PRINT_INTERVAL)
            test_loss, test_accuracy = test(model, device, test_loader)
            train_losses.append((epoch, train_loss))
            train_perplexities.append((epoch, math.exp(train_loss)))
            test_losses.append((epoch, test_loss))
            test_perplexities.append((epoch, math.exp(test_loss)))
            test_accuracies.append((epoch, test_accuracy))
            pt_util.write_log(LOG_PATH,
                              (train_losses, test_losses, train_perplexities, test_perplexities, test_accuracies))
            model.save_best_model(test_accuracy, DATA_PATH + 'checkpoints/%03d.pt' % epoch)
            seed_words = "I"  # 'Harry Potter, Voldemort, and Dumbledore walk into a bar. '
            for ii in range(3):
                generated_sentence = sampler.generate_language(model, device, seed_words, SEQUENCE_LENGTH, vocab, 'sample')
                print('generated sample\t', generated_sentence)
            print('')

    except KeyboardInterrupt as ke:
        print('Interrupted')
    except:
        import traceback
        traceback.print_exc()
    finally:
        print('Saving final model')
        model.save_model(DATA_PATH + 'checkpoints/%03d.pt' % epoch, 0)
        ep, val = zip(*train_losses)
        pt_util.plot(ep, val, 'Train loss', 'Epoch', 'Error')
        ep, val = zip(*test_losses)
        pt_util.plot(ep, val, 'Test loss', 'Epoch', 'Error')
        ep, val = zip(*train_losses)
        pt_util.plot(ep, val, 'Train perplexity', 'Epoch', 'Error')
        ep, val = zip(*test_losses)
        pt_util.plot(ep, val, 'Test perplexity', 'Epoch', 'Error')
        ep, val = zip(*test_accuracies)
        pt_util.plot(ep, val, 'Test accuracy', 'Epoch', 'Error')
        return model, vocab, device


DATA_PATH = "/media/andrey/Elements2/bot_data/"

SEQUENCE_LENGTH = 30
BATCH_SIZE = 64
FEATURE_SIZE = 1024
TEST_BATCH_SIZE = 1024
EPOCHS = 8
LEARNING_RATE = 0.002
LR_DECAY_EVERY = 4
LR_DECAY_FACTOR = 0.25
WEIGHT_DECAY = 0.0005
USE_CUDA = True
PRINT_INTERVAL = 1000
LOG_PATH = DATA_PATH + 'logs/log.pkl'

final_model, vocab, device = main()
