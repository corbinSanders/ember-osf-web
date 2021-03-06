import { tagName } from '@ember-decorators/component';
import Component from '@ember/component';
import { computed } from '@ember/object';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { task } from 'ember-concurrency-decorators';
import Intl from 'ember-intl/services/intl';
import { layout } from 'ember-osf-web/decorators/component';
import ContributorModel from 'ember-osf-web/models/contributor';
import DraftRegistrationModel from 'ember-osf-web/models/draft-registration';
import NodeModel from 'ember-osf-web/models/node';
import { Permission } from 'ember-osf-web/models/osf-model';
import captureException, { getApiErrorMessage } from 'ember-osf-web/utils/capture-exception';
import Toast from 'ember-toastr/services/toast';
import template from './template';

@layout(template)
@tagName('')
export default class ContributorsManager extends Component {
    @service toast!: Toast;
    @service intl!: Intl;
    node?: NodeModel | DraftRegistrationModel;
    @tracked contributors: ContributorModel[] = [];
    @tracked totalPage: number = 1;
    @tracked currentPage: number = 1;
    @tracked isDragging = false;

    @computed('fetchContributors.isRunning', 'hasMore', 'isDragging')
    get shouldShowLoadMore() {
        return !this.fetchContributors.isRunning
            && this.fetchContributors.lastComplete
            && this.hasMore
            && !this.isDragging;
    }

    @computed('currentPage', 'totalPage')
    get hasMore() {
        return this.currentPage <= this.totalPage;
    }

    @task({ withTestWaiter: true, on: 'init', enqueue: true })
    fetchContributors = task(function *(this: ContributorsManager) {
        if (this.node && this.hasMore) {
            const currentPageResult = yield this.node.queryHasMany('contributors', {
                page: this.currentPage,
            });
            this.totalPage = Math.ceil(currentPageResult.meta.total / currentPageResult.meta.per_page);
            this.contributors.pushObjects(currentPageResult);
            this.currentPage += 1;
        }
    });

    @task({ withTestWaiter: true, enqueue: true })
    toggleContributorIsBibliographic = task(function *(this: ContributorsManager, contributor: ContributorModel) {
        contributor.toggleProperty('bibliographic');
        try {
            yield contributor.save();
            this.toast.success(this.intl.t('osf-components.contributors.editIsBibliographic.success'));
        } catch (e) {
            contributor.rollbackAttributes();
            const errorMessage = this.intl.t('osf-components.contributors.editIsBibliographic.error');
            this.toast.error(errorMessage);
            captureException(e, { errorMessage });
        }
    });

    @task({ withTestWaiter: true, enqueue: true })
    updateContributorPermission = task(
        function *(this: ContributorsManager, contributor: ContributorModel, permission: Permission) {
            // eslint-disable-next-line no-param-reassign
            contributor.permission = permission;
            try {
                yield contributor.save();
                this.toast.success(this.intl.t('osf-components.contributors.editPermission.success'));
            } catch (e) {
                contributor.rollbackAttributes();
                const errorMessage = this.intl.t('osf-components.contributors.editPermission.error');
                this.toast.error(errorMessage);
                captureException(e, { errorMessage });
            }
        },
    );

    @task({ withTestWaiter: true, enqueue: true })
    reorderContributor = task(
        function *(this: ContributorsManager, newOrder: ContributorModel[], contributor: ContributorModel) {
            const oldOrder = this.contributors;
            const newIndex = newOrder.indexOf(contributor);
            try {
                contributor.setProperties({
                    index: newIndex,
                });
                this.contributors = newOrder;
                yield contributor.save();
                this.toast.success(this.intl.t('osf-components.contributors.reorderContributor.success'));
            } catch (e) {
                this.contributors = oldOrder;
                this.toast.error(getApiErrorMessage(e));
            }
        },
    );
}
