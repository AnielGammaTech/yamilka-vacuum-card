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
  VacuumCardSetting,
  VacuumCardStat,
} from './types';
import {
  getDefaultHeaderSelects,
  getDefaultHeaderStats,
  getDefaultSettings,
  getVacuumSlug,
} from './config';
import styles from './editor.css';

type ConfigElement = HTMLInputElement & {
  checked?: boolean;
  configValue?: keyof VacuumCardConfig;
};

type SettingEntity = Exclude<VacuumCardSetting, string>;

const ENTITY_DOMAINS = [
  'sensor',
  'select',
  'switch',
  'button',
  'number',
  'time',
  'binary_sensor',
  'camera',
  'image',
  'vacuum',
];

const MAP_MODES: VacuumCardMapMode[] = ['drawer', 'side', 'replace', 'hidden'];

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

  private renderEntityPicker(
    label: string,
    value: string | undefined,
    onChange: (value: string) => void,
    domains: string[] = ENTITY_DOMAINS,
  ): Template {
    return html`
      <ha-entity-picker
        .hass=${this.hass}
        .label=${label}
        .value=${value ?? ''}
        .includeDomains=${domains}
        allow-custom-entity
        @value-changed=${(event: CustomEvent<{ value?: string }>) =>
          onChange(event.detail.value ?? '')}
      ></ha-entity-picker>
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
                ${this.renderEntityPicker(
                  'Entity',
                  row.entity_id,
                  (value) => this.updateHeaderSelect(index, { entity_id: value }),
                  ['select'],
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
                ${this.renderEntityPicker(
                  'Entity',
                  row.entity_id,
                  (value) => this.updateHeaderStat(index, { entity_id: value }),
                  ['sensor', 'binary_sensor', 'number'],
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

  private getSettingsForEditor(): VacuumCardSetting[] {
    if (this.config.settings) {
      return this.config.settings;
    }

    return getDefaultSettings(this.config.entity ?? '');
  }

  private setSettings(settings: VacuumCardSetting[]): void {
    this.updateConfig({ settings });
  }

  private isSection(setting: VacuumCardSetting): boolean {
    return (
      typeof setting !== 'string' &&
      !setting.entity &&
      !setting.entity_id &&
      Boolean(setting.label)
    );
  }

  private updateSetting(
    index: number,
    patch: Partial<SettingEntity>,
  ): void {
    const rows = [...this.getSettingsForEditor()];
    const current =
      typeof rows[index] === 'string'
        ? { entity: rows[index] as string }
        : (rows[index] as SettingEntity);

    rows[index] = { ...current, ...patch };
    this.setSettings(rows);
  }

  private renderSettingEditor(): Template {
    const rows = this.getSettingsForEditor();

    return html`
      <section class="editor-section">
        <div class="section-heading">
          <div>
            <h3>Settings Popup</h3>
            <p>Rows shown when the tune icon opens the popup.</p>
          </div>
        </div>
        ${rows.map((setting, index) => {
          if (this.isSection(setting)) {
            const row = setting as SettingEntity;
            return html`
              <div class="editor-row section-row">
                <div class="row-fields single-field">
                  ${this.renderTextInput('Section', row.label, (value) =>
                    this.updateSetting(index, {
                      entity: undefined,
                      entity_id: undefined,
                      label: value,
                      type: 'section',
                    }),
                  )}
                </div>
                ${this.renderRowActions(
                  index,
                  rows.length,
                  (from, to) => this.setSettings(this.moveItem(rows, from, to)),
                  (rowIndex) =>
                    this.setSettings(rows.filter((_, i) => i !== rowIndex)),
                )}
              </div>
            `;
          }

          const row =
            typeof setting === 'string'
              ? { entity: setting }
              : (setting as SettingEntity);
          const entityId = row.entity ?? row.entity_id;

          return html`
            <div class="editor-row">
              <div class="row-fields setting-fields">
                ${this.renderEntityPicker('Entity', entityId, (value) =>
                  this.updateSetting(index, { entity: value }),
                )}
                ${this.renderTextInput('Label', row.name, (value) =>
                  this.updateSetting(index, { name: value }),
                )}
                ${this.renderTextInput(
                  'Icon',
                  row.icon,
                  (value) => this.updateSetting(index, { icon: value }),
                  'mdi:cog-outline',
                )}
              </div>
              ${this.renderRowActions(
                index,
                rows.length,
                (from, to) => this.setSettings(this.moveItem(rows, from, to)),
                (rowIndex) =>
                  this.setSettings(rows.filter((_, i) => i !== rowIndex)),
              )}
            </div>
          `;
        })}
        <div class="button-row">
          <button
            class="add-button"
            @click=${() =>
              this.setSettings([
                ...rows,
                { entity: '', icon: 'mdi:cog-outline', name: 'Setting' },
              ])}
          >
            <ha-icon icon="mdi:plus"></ha-icon>
            Add setting
          </button>
          <button
            class="add-button"
            @click=${() =>
              this.setSettings([
                ...rows,
                { type: 'section', label: 'Section' },
              ])}
          >
            <ha-icon icon="mdi:format-header-1"></ha-icon>
            Add section
          </button>
        </div>
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
            ${this.renderEntityPicker(
              localize('editor.entity') ?? 'Entity',
              this.config.entity,
              (value) => this.updateConfig({ entity: value }),
              ['vacuum'],
            )}
            ${this.renderEntityPicker(
              localize('editor.battery_entity') ?? 'Battery Entity',
              this.config.battery_entity,
              (value) =>
                value
                  ? this.updateConfig({ battery_entity: value })
                  : this.updateConfig({}, ['battery_entity']),
              ['sensor'],
            )}
            ${this.renderEntityPicker(
              localize('editor.map') ?? 'Map Camera',
              this.config.map,
              (value) =>
                value
                  ? this.updateConfig({ map: value })
                  : this.updateConfig({}, ['map']),
              ['camera', 'image'],
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
            ${this.renderSwitch(
              localize('editor.show_toolbar') ?? 'Show Toolbar',
              'show_toolbar',
              true,
            )}
            ${this.renderSwitch('Map Button', 'show_map_toggle', true)}
          </div>
        </section>

        ${this.renderHeaderSelectEditor()} ${this.renderHeaderStatEditor()}
        ${this.renderSettingEditor()}
      </div>
    `;
  }

  static get styles() {
    return styles;
  }
}
