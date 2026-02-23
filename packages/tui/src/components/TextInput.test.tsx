import { describe, it, expect, vi } from 'vitest'
import React, { useState } from 'react'
import { render } from 'ink-testing-library'
import { Text } from 'ink'
import { TextInput } from './TextInput.js'

const delay = (ms = 10) => new Promise((r) => setTimeout(r, ms))

/** Controlled wrapper so we can observe value changes via rendered output. */
function TestInput({ onSubmit }: { onSubmit?: (v: string) => void }) {
	const [value, setValue] = useState('')
	return (
		<>
			<TextInput value={value} onChange={setValue} onSubmit={onSubmit} />
			<Text>value:{value}</Text>
		</>
	)
}

describe('TextInput', () => {
	it('accepts single-character input', async () => {
		const { stdin, lastFrame } = render(<TestInput />)
		stdin.write('a')
		await delay()
		expect(lastFrame()).toContain('value:a')
	})

	it('accumulates multiple keystrokes', async () => {
		const { stdin, lastFrame } = render(<TestInput />)
		stdin.write('h')
		await delay()
		stdin.write('i')
		await delay()
		expect(lastFrame()).toContain('value:hi')
	})

	it('accepts multi-character paste', async () => {
		const { stdin, lastFrame } = render(<TestInput />)
		stdin.write('hello world')
		await delay()
		expect(lastFrame()).toContain('value:hello world')
	})

	it('converts newlines to spaces on paste', async () => {
		const { stdin, lastFrame } = render(<TestInput />)
		stdin.write('line1\nline2\nline3')
		await delay()
		expect(lastFrame()).toContain('value:line1 line2 line3')
	})

	it('converts carriage returns to spaces on paste', async () => {
		const { stdin, lastFrame } = render(<TestInput />)
		stdin.write('line1\r\nline2')
		await delay()
		expect(lastFrame()).toContain('value:line1 line2')
	})

	it('collapses consecutive newlines to a single space', async () => {
		const { stdin, lastFrame } = render(<TestInput />)
		stdin.write('a\n\n\nb')
		await delay()
		expect(lastFrame()).toContain('value:a b')
	})

	it('handles backspace', async () => {
		const { stdin, lastFrame } = render(<TestInput />)
		stdin.write('abc')
		await delay()
		stdin.write('\x7f') // DEL
		await delay()
		expect(lastFrame()).toContain('value:ab')
	})

	it('calls onSubmit on return', async () => {
		const onSubmit = vi.fn()
		const { stdin } = render(<TestInput onSubmit={onSubmit} />)
		stdin.write('task')
		await delay()
		stdin.write('\r')
		await delay()
		expect(onSubmit).toHaveBeenCalledWith('task')
	})

	it('shows placeholder when value is empty', () => {
		const { lastFrame } = render(
			<TextInput value="" onChange={() => {}} placeholder="type here" />
		)
		expect(lastFrame()).toContain('type here')
	})

	it('does not process input when unfocused', async () => {
		const onChange = vi.fn()
		const { stdin } = render(
			<TextInput value="" onChange={onChange} focus={false} />
		)
		stdin.write('x')
		await delay()
		expect(onChange).not.toHaveBeenCalled()
	})
})
