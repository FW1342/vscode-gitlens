import { css, html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import '../formatted-date';

@customElement('commit-identity')
export class CommitIdentity extends LitElement {
	static override styles = css`
		:host {
			display: grid;
			gap: 0.25rem 0.5rem;
			justify-content: start;
		}
		a {
			color: var(--color-link-foreground);
			text-decoration: none;
		}
		.avatar {
			grid-column: 1;
			grid-row: 1 / 3;
		}
		.name {
			grid-column: 2;
			grid-row: 1;
			font-size: 1.5rem;
		}
		.date {
			grid-column: 2;
			grid-row: 2;
			font-size: 1.2rem;
		}
	`;

	@property()
	name = '';

	@property()
	email = '';

	@property()
	date = '';

	@property()
	avatar = 'https://www.gravatar.com/avatar/?s=16&d=robohash';

	@property({ type: Boolean, reflect: true })
	committer = false;

	override render() {
		console.log('commit-identity committer', this.committer);
		return html`
			<a class="avatar" href="${this.email ? `mailto:${this.email}` : '#'}"
				><img lazy src="${this.avatar}" alt="${this.name}"
			/></a>
			<a class="name" href="${this.email ? `mailto:${this.email}` : '#'}">${this.name}</a>
			<span class="date"
				>${this.committer === true ? 'committed' : 'authored'}
				<formatted-date date="${this.date}"></formatted-date
			></span>
		`;
	}
}
