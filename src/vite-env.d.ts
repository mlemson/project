/// <reference types="vite/client" />

interface SpeechRecognitionResultLike {
	readonly transcript: string
}

interface SpeechRecognitionEventLike {
	readonly results: ArrayLike<ArrayLike<SpeechRecognitionResultLike>>
}

interface SpeechRecognitionLike {
	lang: string
	interimResults: boolean
	maxAlternatives: number
	onresult: ((event: SpeechRecognitionEventLike) => void) | null
	onerror: (() => void) | null
	start(): void
}

interface SpeechRecognitionConstructor {
	new (): SpeechRecognitionLike
}

interface Window {
	SpeechRecognition?: SpeechRecognitionConstructor
	webkitSpeechRecognition?: SpeechRecognitionConstructor
}
