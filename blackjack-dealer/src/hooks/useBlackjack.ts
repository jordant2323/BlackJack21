import { useState, useEffect, useCallback, useRef } from "react";

export type Suit = "hearts" | "diamonds" | "clubs" | "spades";
export type Rank = "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K" | "A";

export interface Card {
  id: string;
  suit: Suit;
  rank: Rank;
  value: number;
  faceUp: boolean;
}

export type PlayerPersonality = "Cautious Carl" | "Bold Bill" | "Basic Betty";

export interface Hand {
  id: string;
  cards: Card[];
  bet: number;
  status: "playing" | "bust" | "stand" | "blackjack" | "surrendered" | "won" | "lost" | "push";
  payout: number;
  doubled: boolean;
}

export interface Player {
  id: string;
  name: string;
  personality: PlayerPersonality;
  chips: number;
  hands: Hand[];
  activeHandIndex: number;
}

export interface GameState {
  deck: Card[];
  dealerCards: Card[];
  players: Player[];
  round: number;
  houseWins: number;
  houseLosses: number;
  totalPaidOut: number;
  payoutsThisRound: Record<string, number>;
  phase: "betting" | "dealing" | "player_turns" | "dealer_turn" | "payouts" | "round_over" | "shuffling";
  currentPlayerIndex: number;
  shoeSize: number;
}

const SUITS: Suit[] = ["hearts", "diamonds", "clubs", "spades"];
const RANKS: Rank[] = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];

function getCardValue(rank: Rank): number {
  if (["J", "Q", "K"].includes(rank)) return 10;
  if (rank === "A") return 11;
  return parseInt(rank);
}

function createDeck(): Card[] {
  const deck: Card[] = [];
  for (let i = 0; i < 6; i++) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        deck.push({
          id: `${i}-${suit}-${rank}-${Math.random().toString(36).substr(2, 9)}`,
          suit,
          rank,
          value: getCardValue(rank),
          faceUp: true,
        });
      }
    }
  }
  return deck.sort(() => Math.random() - 0.5);
}

export function calculateHandValue(cards: Card[]): { total: number; soft: boolean } {
  let total = 0;
  let aces = 0;
  for (const card of cards) {
    if (!card.faceUp) continue;
    total += card.value;
    if (card.rank === "A") aces++;
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }
  return { total, soft: aces > 0 };
}

export function getPayoutResult(
  hand: Hand,
  dealerCards: Card[]
): { outcome: "won" | "lost" | "push" | "blackjack"; correctPayout: number } {
  const dealerFull = dealerCards.map(c => ({ ...c, faceUp: true }));
  const dealerTotal = calculateHandValue(dealerFull).total;
  const dealerBust = dealerTotal > 21;
  const dealerBlackjack = dealerTotal === 21 && dealerCards.length === 2;

  const handVal = calculateHandValue(hand.cards).total;

  if (hand.status === "bust") {
    return { outcome: "lost", correctPayout: 0 };
  }
  if (hand.status === "surrendered") {
    return { outcome: "lost", correctPayout: Math.floor(hand.bet / 2) };
  }
  if (hand.status === "blackjack") {
    if (dealerBlackjack) return { outcome: "push", correctPayout: hand.bet };
    return { outcome: "blackjack", correctPayout: Math.floor(hand.bet * 2.5) };
  }
  if (dealerBust) {
    return { outcome: "won", correctPayout: hand.bet * 2 };
  }
  if (handVal > dealerTotal) {
    return { outcome: "won", correctPayout: hand.bet * 2 };
  }
  if (handVal < dealerTotal) {
    return { outcome: "lost", correctPayout: 0 };
  }
  return { outcome: "push", correctPayout: hand.bet };
}

export function useBlackjack() {
  const [state, setState] = useState<GameState>({
    deck: createDeck(),
    dealerCards: [],
    players: [
      { id: "p1", name: "Carl", personality: "Cautious Carl", chips: 1000, hands: [], activeHandIndex: 0 },
      { id: "p2", name: "Betty", personality: "Basic Betty", chips: 1000, hands: [], activeHandIndex: 0 },
      { id: "p3", name: "Bill", personality: "Bold Bill", chips: 1000, hands: [], activeHandIndex: 0 },
    ],
    round: 1,
    houseWins: 0,
    houseLosses: 0,
    totalPaidOut: 0,
    payoutsThisRound: {},
    phase: "betting",
    currentPlayerIndex: 0,
    shoeSize: 6 * 52,
  });

  const stateRef = useRef(state);
  stateRef.current = state;

  const dealCard = useCallback((faceUp = true): Card => {
    let deck = [...stateRef.current.deck];
    if (deck.length < stateRef.current.shoeSize * 0.2) {
      deck = createDeck();
    }
    const card = deck.pop()!;
    setState(s => ({ ...s, deck }));
    return { ...card, faceUp };
  }, []);

  const placeBetsAndDeal = useCallback(() => {
    if (state.deck.length < state.shoeSize * 0.2) {
      setState(s => ({ ...s, phase: "shuffling" }));
      setTimeout(() => {
        setState(s => ({ ...s, deck: createDeck(), phase: "betting" }));
      }, 2000);
      return;
    }

    const newPlayers = state.players.map(p => {
      const betAmount = Math.max(10, Math.floor(Math.random() * 50) + 10);
      return {
        ...p,
        chips: p.chips - betAmount,
        hands: [{
          id: `h-${p.id}-${Date.now()}`,
          cards: [],
          bet: betAmount,
          status: "playing" as const,
          payout: 0,
          doubled: false
        }],
        activeHandIndex: 0
      };
    });

    setState(s => ({ ...s, players: newPlayers, dealerCards: [], phase: "dealing" }));

    const dealSequence = async () => {
      for (let i = 0; i < newPlayers.length; i++) {
        await new Promise(r => setTimeout(r, 300));
        setState(s => {
          const p = [...s.players];
          p[i].hands[0].cards.push(dealCard(true));
          return { ...s, players: p };
        });
      }
      await new Promise(r => setTimeout(r, 300));
      setState(s => ({ ...s, dealerCards: [dealCard(true)] }));

      for (let i = 0; i < newPlayers.length; i++) {
        await new Promise(r => setTimeout(r, 300));
        setState(s => {
          const p = [...s.players];
          p[i].hands[0].cards.push(dealCard(true));
          const val = calculateHandValue(p[i].hands[0].cards).total;
          if (val === 21) p[i].hands[0].status = "blackjack";
          return { ...s, players: p };
        });
      }
      await new Promise(r => setTimeout(r, 300));
      setState(s => {
        const newDealerCards = [...s.dealerCards, dealCard(false)];
        const dVal = calculateHandValue([{ ...newDealerCards[0], faceUp: true }, { ...newDealerCards[1], faceUp: true }]).total;
        if (dVal === 21) {
          newDealerCards[1].faceUp = true;
          return { ...s, dealerCards: newDealerCards, phase: "payouts" };
        }
        return { ...s, dealerCards: newDealerCards, phase: "player_turns", currentPlayerIndex: 0 };
      });
    };
    dealSequence();
  }, [state, dealCard]);

  // AI Logic
  useEffect(() => {
    if (state.phase !== "player_turns") return;

    const currentPlayer = state.players[state.currentPlayerIndex];
    if (!currentPlayer) {
      setState(s => ({ ...s, phase: "dealer_turn" }));
      return;
    }

    const currentHand = currentPlayer.hands[currentPlayer.activeHandIndex];
    if (!currentHand || currentHand.status !== "playing") {
      if (currentPlayer.activeHandIndex < currentPlayer.hands.length - 1) {
        setState(s => {
          const p = [...s.players];
          p[state.currentPlayerIndex].activeHandIndex++;
          return { ...s, players: p };
        });
      } else {
        setState(s => ({ ...s, currentPlayerIndex: s.currentPlayerIndex + 1 }));
      }
      return;
    }

    const timer = setTimeout(() => {
      const { total } = calculateHandValue(currentHand.cards);
      let action: "hit" | "stand" | "double" = "stand";

      if (currentPlayer.personality === "Cautious Carl") {
        action = total >= 15 ? "stand" : "hit";
      } else if (currentPlayer.personality === "Bold Bill") {
        if (currentHand.cards.length === 2 && [9, 10, 11].includes(total)) action = "double";
        else action = total >= 17 ? "stand" : "hit";
      } else {
        action = total >= 17 ? "stand" : "hit";
      }

      setState(s => {
        const p = [...s.players];
        const idx = s.currentPlayerIndex;
        const handIdx = p[idx].activeHandIndex;

        if (action === "stand") {
          p[idx].hands[handIdx].status = "stand";
        } else if (action === "hit") {
          const newCard = dealCard(true);
          p[idx].hands[handIdx].cards.push(newCard);
          if (calculateHandValue(p[idx].hands[handIdx].cards).total > 21) {
            p[idx].hands[handIdx].status = "bust";
          }
        } else if (action === "double") {
          p[idx].chips -= currentHand.bet;
          p[idx].hands[handIdx].bet *= 2;
          p[idx].hands[handIdx].doubled = true;
          const newCard = dealCard(true);
          p[idx].hands[handIdx].cards.push(newCard);
          if (calculateHandValue(p[idx].hands[handIdx].cards).total > 21) {
            p[idx].hands[handIdx].status = "bust";
          } else {
            p[idx].hands[handIdx].status = "stand";
          }
        }
        return { ...s, players: p };
      });
    }, 1000);

    return () => clearTimeout(timer);
  }, [state.phase, state.currentPlayerIndex, state.players, dealCard]);

  const dealerReveal = () => {
    setState(s => {
      const d = [...s.dealerCards];
      if (d[1]) d[1].faceUp = true;
      const val = calculateHandValue(d).total;
      if (val >= 17) {
        return { ...s, dealerCards: d, phase: "payouts", payoutsThisRound: {} };
      }
      return { ...s, dealerCards: d };
    });
  };

  const dealerHit = () => {
    setState(s => {
      const d = [...s.dealerCards, dealCard(true)];
      const { total } = calculateHandValue(d);
      if (total >= 17) return { ...s, dealerCards: d, phase: "payouts", payoutsThisRound: {} };
      return { ...s, dealerCards: d };
    });
  };

  const dealerStand = () => {
    setState(s => ({ ...s, phase: "payouts", payoutsThisRound: {} }));
  };

  // Manual payout: cap at correctPayout so dealer can't overpay
  const payoutChips = useCallback((playerId: string, amount: number, correctPayout: number) => {
    setState(s => {
      const alreadyPaid = s.payoutsThisRound[playerId] ?? 0;
      const remaining = correctPayout - alreadyPaid;
      const capped = Math.min(amount, remaining);
      if (capped <= 0) return s;
      return {
        ...s,
        totalPaidOut: s.totalPaidOut + capped,
        payoutsThisRound: { ...s.payoutsThisRound, [playerId]: alreadyPaid + capped },
        players: s.players.map(p =>
          p.id === playerId ? { ...p, chips: p.chips + capped } : p
        ),
      };
    });
  }, []);

  // Collect losing bet from player (house wins — no chips given back)
  const collectBet = useCallback((playerId: string) => {
    // This is a visual acknowledgment — the bet was already deducted at deal time
    // Just mark to track house wins
    setState(s => ({ ...s, houseWins: s.houseWins + 1 }));
  }, []);

  const finishPayouts = useCallback(() => {
    setState(s => ({
      ...s,
      phase: "round_over",
      round: s.round + 1,
    }));
  }, []);

  const nextRound = useCallback(() => {
    setState(s => ({ ...s, phase: "betting" }));
  }, []);

  return {
    state,
    placeBetsAndDeal,
    dealerReveal,
    dealerHit,
    dealerStand,
    payoutChips,
    collectBet,
    finishPayouts,
    nextRound,
    payoutsThisRound: state.payoutsThisRound,
  };
}
