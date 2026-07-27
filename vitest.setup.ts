import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Unmount whatever the last test rendered.
//
// @testing-library/react normally registers this itself, but only when
// `afterEach` is already a bare global at the moment the library is imported.
// vitest.config.ts sets `globals: false` on purpose -- see the note there -- so
// that auto-wiring never fires, and every `render()` in a file stays mounted for
// the tests that follow it.
//
// The failure that produces is actively misleading: the second test in a file
// queries by role and name, finds the element it just rendered AND the identical
// one the previous test left behind, and fails with "found multiple elements".
// It reads as a bug in the component's markup rather than as leaked state, and
// it only appears once a file has two tests that render the same thing -- so a
// file passes right up until someone adds a test to it.
//
// Registered here, in the one place that runs before every test file, rather
// than in each test file: two separate agents writing two unrelated primitives
// both hit this and both wrote their own copy, which is the signal that it does
// not belong in the test files at all.
afterEach(() => {
    cleanup();
});
