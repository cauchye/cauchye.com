import { defineLiveCollection } from 'astro:content';
import { emdashLoader } from 'emdash/runtime';

// EmDash serves every content type through this single live collection; query it with
// getEmDashCollection() / getEmDashEntry().
export const collections = {
	_emdash: defineLiveCollection({ loader: emdashLoader() })
};
