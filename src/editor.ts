import { LitElement, html, nothing } from 'lit';
import {
  HomeAssistant,
  LovelaceCardConfig,
  LovelaceCardEditor,
  fireEvent,
} from 'custom-card-helpers';
import localize from './localize';
import { customElement, property, state } from 'lit/decorators.js';
import {
  Template,
  VacuumCardConfig,
  VacuumCardHeaderSelect,
  VacuumCardMapMode,
  VacuumCardStat,
  VacuumCardToolbarButton,
} from './types';
import {
  getDefaultHeaderSelects,
  getDefaultHeaderStats,
  getVacuumSlug,
} from './config';
import styles from './editor.css';

type ConfigElement = HTMLInputElement & {
  checked?: boolean;
  configValue?: keyof VacuumCardConfig;
};

const MAP_MODES: VacuumCardMapMode[] = ['drawer', 'side', 'replace', 'hidden'];
const TOOLBAR_ACTIONS = [
  'start',
  'pause',
  'stop',
  'return_to_base',
  'locate',
  'resume',
];
const DEFAULT_TOOLBAR_BUTTONS: VacuumCardToolbarButton[] = [
  {
    action: 'pause',
    icon: 'mdi:pause',
    name: 'Pause',
    states: ['cleaning', 'on', 'auto', 'spot', 'edge', 'single_room', 'returning'],
  },
  {
    action: 'stop',
    icon: 'mdi:stop',
    name: 'Stop',
    states: ['cleaning', 'on', 'auto', 'spot', 'edge', 'single_room'],
  },
  {
    action: 'return_to_base',
    icon: 'mdi:home-import-outline',
    name: 'Dock',
    states: [
      'cleaning',
      'on',
      'auto',
      'spot',
      'edge',
      'single_room',
      'paused',
      'idle',
    ],
  },
  {
    action: 'resume',
    icon: 'mdi:play',
    name: 'Continue',
    states: ['paused', 'returning'],
  },
  {
    action: 'start',
    icon: 'mdi:play',
    name: 'Clean',
    states: ['docked', 'idle'],
  },
  {
    action: 'locate',
    icon: 'mdi:crosshairs-gps',
    name: 'Locate',
    states: ['docked', 'idle'],
  },
];

@customElement('yamilka-vacuum-card-editor')
export class VacuumCardEditor extends LitElement implements LovelaceCardEditor {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private config!: Partial<VacuumCardConfig>;

  setConfig(config: LovelaceCardConfig & VacuumCardConfig): void {
    this.config = { ...config };

    if (!this.config.entity) {
      this.config.entity = this.getEntitiesByType('vacuum')[0] || '';
      fireEvent(this, 'config-changed', { config: this.config });
    }
  }

  private getEntitiesByType(type: string): string[] {
    if (!this.hass) {
      return [];
    }

    return Object.keys(this.hass.states)
      .filter((id) => id.startsWith(`${type}.`))
      .sort();
  }

  private updateConfig(
    patch: Partial<VacuumCardConfig>,
    deleteKeys: (keyof VacuumCardConfig)[] = [],
  ): void {
    const next: Partial<VacuumCardConfig> = { ...this.config, ...patch };

    deleteKeys.forEach((key) => delete next[key]);
    this.config = next;
    fireEvent(this, 'config-changed', { config: next });
  }

  private valueChanged(event: Event): void {
    if (!this.config || !this.hass || !event.target) {
      return;
    }

    const target = event.target as ConfigElement;
    if (!target.configValue) {
      return;
    }

    const value =
      target.checked !== undefined ? target.checked : target.value;

    if (value === '') {
      this.updateConfig({}, [target.configValue]);
      return;
    }

    this.updateConfig({ [target.configValue]: value } as Partial<
      VacuumCardConfig
    >);
  }

  private renderSwitch(
    label: string,
    key: keyof VacuumCardConfig,
    defaultValue: boolean,
  ): Template {
    return html`
      <label class="switch-option">
        <ha-switch
          .checked=${Boolean(this.config[key] ?? defaultValue)}
          .configValue=${key}
          @change=${this.valueChanged}
        >
        </ha-switch>
        <span>${label}</span>
      </label>
    `;
  }

  private renderTextInput(
    label: string,
    value: string | undefined,
    onChange: (value: string) => void,
    placeholder = '',
  ): Template {
    return html`
      <paper-input
        label=${label}
        .value=${value ?? ''}
        placeholder=${placeholder}
        @value-changed=${(event: Event) =>
          onChange((event.target as HTMLInputElement).value)}
      ></paper-input>
    `;
  }

  private renderSelectInput(
    label: string,
    value: string | undefined,
    options: string[],
    onChange: (value: string) => void,
    allowNone = true,
  ): Template {
    return html`
      <ha-select
        .label=${label}
        .value=${value ?? ''}
        @selected=${(event: Event) =>
          onChange((event.target as HTMLInputElement).value)}
        @closed=${(event: Event) => event.stopPropagation()}
        fixedMenuPosition
        naturalMenuWidth
      >
        ${allowNone
          ? html`<mwc-list-item .value=${''}>None</mwc-list-item>`
          : nothing}
        ${options.map(
          (option) => html`
            <mwc-list-item .value=${option}>${option}</mwc-list-item>
          `,
        )}
      </ha-select>
    `;
  }

  private renderEntityInput(
    label: string,
    value: string | undefined,
    onChange: (value: string) => void,
    placeholder = 'domain.entity_name',
  ): Template {
    return html`
      ${this.renderTextInput(label, value, onChange, placeholder)}
    `;
  }

  private renderRowActions(
    index: number,
    length: number,
    onMove: (from: number, to: number) => void,
    onRemove: (index: number) => void,
  ): Template {
    return html`
      <div class="row-actions">
        <button
          aria-label="Move up"
          ?disabled=${index === 0}
          @click=${() => onMove(index, index - 1)}
        >
          <ha-icon icon="mdi:chevron-up"></ha-icon>
        </button>
        <button
          aria-label="Move down"
          ?disabled=${index === length - 1}
          @click=${() => onMove(index, index + 1)}
        >
          <ha-icon icon="mdi:chevron-down"></ha-icon>
        </button>
        <button aria-label="Remove" @click=${() => onRemove(index)}>
          <ha-icon icon="mdi:trash-can-outline"></ha-icon>
        </button>
      </div>
    `;
  }

  private moveItem<T>(items: T[], from: number, to: number): T[] {
    if (to < 0 || to >= items.length) {
      return items;
    }

    const next = [...items];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    return next;
  }

  private getHeaderSelectsForEditor(): VacuumCardHeaderSelect[] {
    if (this.config.header_selects) {
      return this.config.header_selects;
    }

    return getDefaultHeaderSelects(this.config.entity ?? '');
  }

  private setHeaderSelects(header_selects: VacuumCardHeaderSelect[]): void {
    this.updateConfig({ header_selects });
  }

  private updateHeaderSelect(
    index: number,
    patch: Partial<VacuumCardHeaderSelect>,
  ): void {
    const rows = [...this.getHeaderSelectsForEditor()];
    rows[index] = { ...rows[index], ...patch };
    this.setHeaderSelects(rows);
  }

  private renderHeaderSelectEditor(): Template {
    const rows = this.getHeaderSelectsForEditor();
    const slug = getVacuumSlug(this.config.entity ?? '');
    const fallbackEntity = slug ? `select.${slug}_clean_room` : '';

    return html`
      <section class="editor-section">
        <div class="section-heading">
          <div>
            <h3>Header Dropdowns</h3>
            <p>Small controls beside fan speed, like Room.</p>
          </div>
          ${this.renderSwitch('Show', 'show_header_selects', true)}
        </div>
        ${rows.map(
          (row, index) => html`
            <div class="editor-row">
              <div class="row-fields">
                ${this.renderEntityInput(
                  'Entity',
                  row.entity_id,
                  (value) => this.updateHeaderSelect(index, { entity_id: value }),
                  'select.yamilka_clean_room',
                )}
                ${this.renderTextInput('Label', row.name, (value) =>
                  this.updateHeaderSelect(index, { name: value }),
                )}
                ${this.renderTextInput(
                  'Icon',
                  row.icon,
                  (value) => this.updateHeaderSelect(index, { icon: value }),
                  'mdi:door-open',
                )}
              </div>
              ${this.renderRowActions(
                index,
                rows.length,
                (from, to) => this.setHeaderSelects(this.moveItem(rows, from, to)),
                (rowIndex) =>
                  this.setHeaderSelects(rows.filter((_, i) => i !== rowIndex)),
              )}
            </div>
          `,
        )}
        <button
          class="add-button"
          @click=${() =>
            this.setHeaderSelects([
              ...rows,
              {
                entity_id: fallbackEntity,
                icon: 'mdi:door-open',
                name: 'Room',
              },
            ])}
        >
          <ha-icon icon="mdi:plus"></ha-icon>
          Add dropdown
        </button>
      </section>
    `;
  }

  private getHeaderStatsForEditor(): VacuumCardStat[] {
    if (this.config.header_stats) {
      return this.config.header_stats;
    }

    return getDefaultHeaderStats(this.config.entity ?? '');
  }

  private setHeaderStats(header_stats: VacuumCardStat[]): void {
    this.updateConfig({ header_stats });
  }

  private updateHeaderStat(index: number, patch: Partial<VacuumCardStat>): void {
    const rows = [...this.getHeaderStatsForEditor()];
    rows[index] = { ...rows[index], ...patch };
    this.setHeaderStats(rows);
  }

  private renderHeaderStatEditor(): Template {
    const rows = this.getHeaderStatsForEditor();

    return html`
      <section class="editor-section">
        <div class="section-heading">
          <div>
            <h3>Header Metrics</h3>
            <p>Small value chips under the top controls.</p>
          </div>
          ${this.renderSwitch('Show', 'show_header_stats', true)}
        </div>
        ${rows.map(
          (row, index) => html`
            <div class="editor-row">
              <div class="row-fields metric-fields">
                ${this.renderEntityInput(
                  'Entity',
                  row.entity_id,
                  (value) => this.updateHeaderStat(index, { entity_id: value }),
                  'sensor.yamilka_cleaning_area',
                )}
                ${this.renderTextInput('Label', row.subtitle, (value) =>
                  this.updateHeaderStat(index, { subtitle: value }),
                )}
                ${this.renderTextInput('Unit', row.unit, (value) =>
                  this.updateHeaderStat(index, { unit: value }),
                )}
                ${this.renderTextInput(
                  'Icon',
                  row.icon,
                  (value) => this.updateHeaderStat(index, { icon: value }),
                  'mdi:information-outline',
                )}
              </div>
              ${this.renderRowActions(
                index,
                rows.length,
                (from, to) => this.setHeaderStats(this.moveItem(rows, from, to)),
                (rowIndex) =>
                  this.setHeaderStats(rows.filter((_, i) => i !== rowIndex)),
              )}
            </div>
          `,
        )}
        <button
          class="add-button"
          @click=${() =>
            this.setHeaderStats([
              ...rows,
              {
                entity_id: '',
                icon: 'mdi:information-outline',
                subtitle: 'Metric',
              },
            ])}
        >
          <ha-icon icon="mdi:plus"></ha-icon>
          Add metric
        </button>
      </section>
    `;
  }

  private getToolbarButtonsForEditor(): VacuumCardToolbarButton[] {
    if (this.config.toolbar_buttons) {
      return this.config.toolbar_buttons;
    }

    return DEFAULT_TOOLBAR_BUTTONS;
  }

  private setToolbarButtons(toolbar_buttons: VacuumCardToolbarButton[]): void {
    this.updateConfig({ toolbar_buttons });
  }

  private updateToolbarButton(
    index: number,
    patch: Partial<VacuumCardToolbarButton>,
  ): void {
    const rows = [...this.getToolbarButtonsForEditor()];
    rows[index] = { ...rows[index], ...patch };
    this.setToolbarButtons(rows);
  }

  private parseStateList(value: string): string[] {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  private renderToolbarButtonEditor(): Template {
    const rows = this.getToolbarButtonsForEditor();

    return html`
      <section class="editor-section">
        <div class="section-heading">
          <div>
            <h3>Main Buttons</h3>
            <p>Edit the buttons shown on the card toolbar.</p>
          </div>
          ${this.renderSwitch('Show', 'show_toolbar', true)}
        </div>
        ${rows.map(
          (row, index) => html`
            <div class="editor-row">
              <div class="row-fields toolbar-fields">
                ${this.renderTextInput('Label', row.name, (value) =>
                  this.updateToolbarButton(index, { name: value }),
                )}
                ${this.renderTextInput(
                  'Icon',
                  row.icon,
                  (value) => this.updateToolbarButton(index, { icon: value }),
                  'mdi:gesture-tap-button',
                )}
                ${this.renderSelectInput(
                  'Action',
                  row.action,
                  TOOLBAR_ACTIONS,
                  (value) => this.updateToolbarButton(index, { action: value }),
                  false,
                )}
                ${this.renderTextInput(
                  'Visible States',
                  row.states?.join(', '),
                  (value) =>
                    this.updateToolbarButton(index, {
                      states: this.parseStateList(value),
                    }),
                  'cleaning, paused, idle',
                )}
              </div>
              ${this.renderRowActions(
                index,
                rows.length,
                (from, to) =>
                  this.setToolbarButtons(this.moveItem(rows, from, to)),
                (rowIndex) =>
                  this.setToolbarButtons(rows.filter((_, i) => i !== rowIndex)),
              )}
            </div>
          `,
        )}
        <button
          class="add-button"
          @click=${() =>
            this.setToolbarButtons([
              ...rows,
              {
                action: 'start',
                icon: 'mdi:play',
                name: 'Clean',
                states: ['idle', 'docked'],
              },
            ])}
        >
          <ha-icon icon="mdi:plus"></ha-icon>
          Add button
        </button>
      </section>
    `;
  }

  protected render(): Template {
    if (!this.hass) {
      return nothing;
    }

    return html`
      <div class="card-config">
        <section class="editor-section">
          <div class="section-heading">
            <div>
              <h3>Main</h3>
              <p>Card entity, image, size, and map behavior.</p>
            </div>
          </div>
          <div class="main-grid">
            ${this.renderEntityInput(
              localize('editor.entity') ?? 'Entity',
              this.config.entity,
              (value) => this.updateConfig({ entity: value }),
              'vacuum.yamilka',
            )}
            ${this.renderEntityInput(
              localize('editor.battery_entity') ?? 'Battery Entity',
              this.config.battery_entity,
              (value) =>
                value
                  ? this.updateConfig({ battery_entity: value })
                  : this.updateConfig({}, ['battery_entity']),
              'sensor.yamilka_battery',
            )}
            ${this.renderEntityInput(
              localize('editor.map') ?? 'Map Camera',
              this.config.map,
              (value) =>
                value
                  ? this.updateConfig({ map: value })
                  : this.updateConfig({}, ['map']),
              'camera.yamilka_map',
            )}
            ${this.renderSelectInput(
              'Map Mode',
              this.config.map_mode ?? 'drawer',
              MAP_MODES,
              (value) =>
                this.updateConfig({ map_mode: value as VacuumCardMapMode }),
              false,
            )}
            ${this.renderTextInput(
              'Card Width',
              this.config.card_width,
              (value) =>
                value
                  ? this.updateConfig({ card_width: value })
                  : this.updateConfig({}, ['card_width']),
              '260px',
            )}
            ${this.renderTextInput(
              localize('editor.image') ?? 'Image',
              this.config.image,
              (value) =>
                value
                  ? this.updateConfig({ image: value })
                  : this.updateConfig({}, ['image']),
              'yamilka',
            )}
          </div>
          <div class="switch-grid">
            ${this.renderSwitch(
              localize('editor.compact_view') ?? 'Compact View',
              'compact_view',
              false,
            )}
            ${this.renderSwitch(
              localize('editor.show_name') ?? 'Show Name',
              'show_name',
              true,
            )}
            ${this.renderSwitch(
              localize('editor.show_status') ?? 'Show Status',
              'show_status',
              true,
            )}
            ${this.renderSwitch('Map Button', 'show_map_toggle', true)}
          </div>
        </section>

        ${this.renderToolbarButtonEditor()}
        ${this.renderHeaderSelectEditor()} ${this.renderHeaderStatEditor()}
      </div>
    `;
  }

  static get styles() {
    return styles;
  }
}
