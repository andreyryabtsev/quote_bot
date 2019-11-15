import re


PUNCTUATION = ["?", "!", ".", ":", ";", ",", '"']

separators = "(" + "|".join(re.escape(t) for t in PUNCTUATION + [" "]) + ")"


def to_words(ss):
    return [s for s in re.split(separators, ss) if s != " " and s != ""]
