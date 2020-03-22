import re

from language_sampler import LanguageSampler
from dataset import NLTextDataset
from model import LanguageModel
from vocab import WordVocabulary
from shared import PUNCTUATION, to_words

DATA_PATH = "/media/andrey/Elements2/bot_data/"
FEATURE_SIZE = 1024  # todo create config system
TEMPERATURE = 1.25
SEQUENCE_LENGTH = 25
BATCH_SIZE = 64
BEAM_WIDTH = 15

device = "cuda"
data_train = NLTextDataset(DATA_PATH + 'words_train.pkl', SEQUENCE_LENGTH, BATCH_SIZE, vc=WordVocabulary)
vocab = data_train.vocab
model = LanguageModel(data_train.vocab_size(), FEATURE_SIZE).to(device)
# print(f"unknown_idx = {vocab.index}")
sampler = LanguageSampler(TEMPERATURE, BEAM_WIDTH)
model.load_last_model(DATA_PATH + 'checkpoints')

seed_words = 'jihyung'

for ii in range(10):
    generated_sentence = sampler.generate_language(model, device, seed_words, SEQUENCE_LENGTH, vocab, 'beam')
    i_end = max(generated_sentence.rfind(p) for p in PUNCTUATION) + 1
    if i_end == 0 or i_end < len(generated_sentence) // 2:
        i_end = len(generated_sentence)
    generated_sentence = generated_sentence[:i_end]
    # generated_sentence = re.sub(r'(:|!) [0-9]', lambda a: a.group()[0]+a.group()[2], generated_sentence)
    print('generated with beam\t', generated_sentence)
