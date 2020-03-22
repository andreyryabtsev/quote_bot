import torch
import random


def sample(output, num):
    return torch.multinomial(output.view(-1), num, replacement=True)


class LanguageSampler:

    def __init__(self, temp, beam_width):
        self.temperature = temp
        self.beam_width = beam_width

    def gen_max(self, sequence_length, model, output, hidden):
        output = output.max(-1)[1]
        outputs = [output]
        for ii in range(sequence_length):
            output, hidden = model.inference(output, hidden, temperature=self.temperature)
            output = output.max(-1)[1]
            outputs.append(output)
        return outputs

    def gen_sample(self, sequence_length, model, output, hidden):
        output = sample(output, 1)
        outputs = [output]
        for ii in range(sequence_length):
            output, hidden = model.inference(output, hidden, temperature=self.temperature)
            output = sample(output, 1)
            outputs.append(output)
        return outputs

    def gen_beam(self, sequence_length, model, output, hidden):
        beams = []  # ([], output, hidden, 0)
        samples = sample(output, self.beam_width)
        log_probabilities = torch.log(output[0, samples])
        for k in range(self.beam_width):
            beams.append(([samples[k]], samples[k], hidden, log_probabilities[k]))

        for ii in range(sequence_length - 1):
            new_beams = []
            for j in range(len(beams)):
                string, output, hidden, score = beams[j]
                output, hidden = model.inference(output, hidden, temperature=self.temperature)
                samples = sample(output, self.beam_width)
                log_probabilities = torch.log(output[0, samples]) + score
                for k in range(self.beam_width):
                    new_beams.append((string + [samples[k]], samples[k], hidden, log_probabilities[k]))
            new_beams.sort(key=lambda b: b[-1], reverse=True)
            beams = new_beams[0:self.beam_width]

        return beams[0][0]

    def generate_language(self, model, device, seed_words, sequence_length, vocab, strategy='max'):
        model.eval()

        if seed_words == "":
            words = list(vocab.voc2ind.keys())
            seed_words = words[random.randint(0, len(words) - 1)]

        with torch.no_grad():
            seed_words_arr = vocab.words_to_array(seed_words)

            # Computes the initial hidden state from the prompt (seed words).
            hidden = None
            for ind in seed_words_arr:
                data = ind.to(device)
                output, hidden = model.inference(data, hidden)

            outputs = getattr(self, f"gen_{strategy}")(sequence_length, model, output, hidden)

            return vocab.array_to_words(seed_words_arr.tolist() + outputs)
