import React, { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Temporary: proves the test harness renders React 19, runs jsdom and drives
// user-event. Deleted once the first real test lands.
const Toy: React.FC = () => {
    const [on, setOn] = useState(false);
    return (
        <button type="button" aria-pressed={on} onClick={() => setOn((v) => !v)}>
            toggle
        </button>
    );
};

describe('test harness', () => {
    it('renders and reacts to a click', async () => {
        const user = userEvent.setup();
        render(<Toy />);
        const button = screen.getByRole('button', { name: 'toggle' });
        expect(button.getAttribute('aria-pressed')).toBe('false');
        await user.click(button);
        expect(button.getAttribute('aria-pressed')).toBe('true');
    });
});
