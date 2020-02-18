import { tagName } from '@ember-decorators/component';
import Component from '@ember/component';
import { action } from '@ember/object';
import { ChangesetDef } from 'ember-changeset/types';
import config from 'ember-get-config';
import { layout } from 'ember-osf-web/decorators/component';
import pathJoin from 'ember-osf-web/utils/path-join';
import { TagsManager } from 'osf-components/components/editable-field/tags-manager/component';
import template from './template';

const {
    OSF: { url: baseUrl },
} = config;

export type MetadataTagsManager = Pick<TagsManager, 'addTag' | 'removeTag' | 'clickTag'>;

@tagName('')
@layout(template)
export default class MetadataTagsManagerComponent extends Component {
    // required
    changeset!: ChangesetDef;
    valuePath!: string;

    // optional
    onMetadataInput?: () => void;

    // properties
    tags: string[] = [];

    @action
    addTag(tag: string) {
        this.set('tags', [...this.tags, tag].sort());
        this.changeset.set(this.valuePath, this.tags);
        if (this.onMetadataInput) {
            this.onMetadataInput();
        }
    }

    @action
    removeTag(index: number) {
        this.set('tags', this.tags.slice().removeAt(index));
        this.changeset.set(this.valuePath, this.tags);
        if (this.onMetadataInput) {
            this.onMetadataInput();
        }
    }

    @action
    clickTag(tag: string): void {
        window.location.assign(`${pathJoin(baseUrl, 'search')}?q=(tags:"${encodeURIComponent(tag)}")`);
    }
}