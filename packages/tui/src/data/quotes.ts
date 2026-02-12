export interface QuoteData {
	text: string
	author?: string
}

export const quotes: readonly QuoteData[] = [
	{
		text:
			'Before enlightenment, chop wood, carry water. After enlightenment, chop wood, carry water.',
	},
	{
		text: 'When hungry eat rice; when tired sleep.',
	},
	{
		text: 'Empty your cup.',
	},
	{
		text: 'What is this?',
	},
	{
		text: 'Out of nowhere, the mind comes forth.',
	},
	{
		text: 'Keep Calmly Knowing Change.',
		author: 'Bhikkhu Anālayo',
	},
	{
		text: 'Walk as if you are kissing the Earth with your feet.',
		author: 'Thich Nhat Hanh',
	},
	{
		text: 'If you miss the present moment, you miss your appointment with life.',
		author: 'Thich Nhat Hanh',
	},
	{
		text: 'Be where you are, otherwise you will miss your life.',
		author: 'Buddha',
	},
	{
		text: 'Mindfulness means being awake. It means knowing what you are doing.',
		author: 'Jon Kabat-Zinn',
	},
	{
		text:
			'To produce at your peak level, you need to work for extended periods with full concentration on a single task free from distraction.',
		author: 'Cal Newport',
	},
	{
		text: "If it's out of your hands, it deserves freedom from your mind too.",
		author: 'Ivan Nuru',
	},
	{
		text:
			'Few of us ever live in the present. We are forever anticipating what is to come or remembering what has gone.',
		author: "Louis L'Amour",
	},
	{
		text: 'In the midst of movement and chaos, keep stillness inside of you.',
		author: 'Deepak Chopra',
	},
	{
		text:
			'Between stimulus and response there is a space. In that space is our power to choose our response.',
		author: 'Viktor Frankl',
	},
	{
		text: "The little things? The little moments? They aren't little.",
		author: 'Jon Kabat-Zinn',
	},
	{
		text: 'Slowing down the action speeds up the outcome.',
		author: 'Shamash Alidina',
	},
	{
		text: 'The way you speak to yourself matters.',
	},
	{
		text:
			"Curb your desire—don't set your heart on so many things and you will get what you need.",
		author: 'Epictetus',
	},
	{
		text:
			'The chief task in life is simply this: to identify and separate matters so that I can say clearly to myself which are externals not under my control, and which have to do with the choices I actually control.',
		author: 'Epictetus',
	},
	{
		text: "Don't explain your philosophy. Embody it.",
		author: 'Epictetus',
	},
	{
		text:
			"That's why the philosophers warn us not to be satisfied with mere learning, but to add practice and then training.",
		author: 'Epictetus',
	},
	{
		text: 'Waste no more time arguing what a good man should be. Be one.',
		author: 'Marcus Aurelius',
	},
	{
		text:
			"Choose not to be harmed—and you won't feel harmed. Don't feel harmed—and you haven't been.",
		author: 'Marcus Aurelius',
	},
	{
		text:
			'External things are not the problem. It is your assessment of them. Which you can erase right now.',
		author: 'Marcus Aurelius',
	},
	{
		text:
			'It never ceases to amaze me: we all love ourselves more than other people, but care more about their opinion than our own.',
		author: 'Marcus Aurelius',
	},
	{
		text: 'Be tolerant with others and strict with yourself.',
		author: 'Marcus Aurelius',
	},
	{
		text:
			'We are more often frightened than hurt; and we suffer more in imagination than in reality.',
		author: 'Seneca',
	},
	{
		text:
			"No person has the power to have everything they want, but it is in their power not to want what they don't have, and to cheerfully put to good use what they do have.",
		author: 'Seneca',
	},
	{
		text:
			"Nothing, to my way of thinking, is a better proof of a well ordered mind than a man's ability to stop just where he is and pass some time in his own company.",
		author: 'Seneca',
	},
	{
		text: 'If a man knows not which port he sails, no wind is favorable.',
		author: 'Seneca',
	},
]

export function getRandomQuote(): QuoteData {
	const index = Math.floor(Math.random() * quotes.length)
	return quotes[index] ?? { text: 'Be present.' }
}
