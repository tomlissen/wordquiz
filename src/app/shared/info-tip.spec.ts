import { TestBed } from '@angular/core/testing';
import { InfoTip } from './info-tip';

async function setup() {
  const fixture = TestBed.createComponent(InfoTip);
  fixture.componentRef.setInput('label', 'About notes');
  fixture.componentRef.setInput('text', 'Shown after answering.');
  document.body.appendChild(fixture.nativeElement);
  await fixture.whenStable();
  const el = fixture.nativeElement as HTMLElement;
  return { fixture, button: el.querySelector('button')!, tip: el.querySelector('[role=tooltip]')! };
}

describe('InfoTip', () => {
  it('describes the button with the tooltip text', async () => {
    const { button, tip } = await setup();
    expect(button.getAttribute('aria-label')).toBe('About notes');
    expect(button.getAttribute('aria-describedby')).toBe(tip.id);
    expect(tip.textContent).toBe('Shown after answering.');
  });

  it('opens on click and stays open, closes on Escape or a click elsewhere', async () => {
    const { fixture, button, tip } = await setup();
    button.click();
    button.click();
    await fixture.whenStable();
    expect(tip.classList).toContain('open');

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await fixture.whenStable();
    expect(tip.classList).not.toContain('open');

    button.click();
    document.body.click();
    await fixture.whenStable();
    expect(tip.classList).not.toContain('open');
  });
});
