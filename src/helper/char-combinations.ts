import { Collection } from 'discord.js';
import { Card } from '../wiki/parser';

interface Combination {
  combinationName: string;
  startingIndex: number;
  length: number;
}

interface CardCombinations {
  charName: string;
  combinations: string[];
}

function getCombinationData(card: Card): CardCombinations {
  const combinations = [card.combin1, card.combin2, card.combin3, card.combin4, card.combin5].filter(
    (combin) => !!combin,
  );

  return {
    charName: card.name,
    combinations: combinations,
  };
}

function getCombinationDataList(cardList: Card[]): CardCombinations[] {
  return cardList.map((card) => getCombinationData(card));
}

function countGroup(cards: CardCombinations[], startingIndex: number, combinationName: string): Combination {
  let iterate = true;
  let index = startingIndex;

  while (iterate && index < cards.length) {
    if (cards[index].combinations.includes(combinationName)) {
      index++;
    } else {
      iterate = false;
    }
  }

  return {
    combinationName: combinationName,
    startingIndex: startingIndex,
    length: index - startingIndex,
  };
}

function cardCombinations(cardList: Card[]): Combination[] {
  const combinations = new Collection<string, Combination>();

  // Get each character's combinations in list format
  const combinationsList = getCombinationDataList(cardList);

  // Starting at each character...
  for (let c = 0; c < combinationsList.length; c++) {
    // For each of their combinations,
    // get the length of the group subsequence
    const charData = combinationsList[c];
    for (let g = 0; g < charData.combinations.length; g++) {
      const combinationName = charData.combinations[g];
      // If the combination already exists, the longest one was already found.)
      const combination = countGroup(combinationsList, c, combinationName);
      if (combinations.has(combinationName)) {
        const oldData = combinations.get(combinationName);
        if (oldData && combination.length > oldData.length) {
          combinations.set(combinationName, combination);
        }
      } else if (combination.length >= 3) {
        combinations.set(combinationName, combination);
      }
    }
  }

  return combinations.array();
}

export { cardCombinations };
