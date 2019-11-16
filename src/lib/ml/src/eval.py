from language_sampler import LanguageSampler
from dataset import NLTextDataset
from model import LanguageModel
from vocab import WordVocabulary


DATA_PATH = "/media/andrey/Elements2/bot_data/"
FEATURE_SIZE = 1024  # todo create config system
TEMPERATURE = 2
SEQUENCE_LENGTH = 30
BATCH_SIZE = 64


device = "cuda"
data_train = NLTextDataset(DATA_PATH + 'words_train.pkl', SEQUENCE_LENGTH, BATCH_SIZE, vc=WordVocabulary)
vocab = data_train.vocab
model = LanguageModel(data_train.vocab_size(), FEATURE_SIZE).to(device)
sampler = LanguageSampler(1.5, 10)
model.load_last_model(DATA_PATH + 'checkpoints')


seed_words = 'Books'

generated_sentence = sampler.generate_language(model, device, seed_words, SEQUENCE_LENGTH, vocab, 'max')
print('generated with max\t', generated_sentence)

for ii in range(0):
    generated_sentence = sampler.generate_language(model, device, seed_words, SEQUENCE_LENGTH, vocab, 'sample')
    print('generated with sample\t', generated_sentence)

for ii in range(5):
    generated_sentence = sampler.generate_language(model, device, seed_words, SEQUENCE_LENGTH, vocab, 'beam')
    print('generated with beam\t', generated_sentence)
