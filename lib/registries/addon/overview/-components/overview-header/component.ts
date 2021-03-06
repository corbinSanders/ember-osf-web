import Component from '@ember/component';
import { computed } from '@ember/object';
import { not } from '@ember/object/computed';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { task } from 'ember-concurrency-decorators';
import DS from 'ember-data';
import Intl from 'ember-intl/services/intl';
import Media from 'ember-responsive';
import Toast from 'ember-toastr/services/toast';

import ModeratorModel from 'ember-osf-web/models/moderator';
import RegistrationModel from 'ember-osf-web/models/registration';
import CurrentUserService from 'ember-osf-web/services/current-user';
import captureException from 'ember-osf-web/utils/capture-exception';

export default class OverviewHeader extends Component {
    @service media!: Media;
    @service currentUser!: CurrentUserService;
    @service store!: DS.Store;
    @service intl!: Intl;
    @service toast!: Toast;

    @not('media.isDesktop') showMobileView!: boolean;

    registration!: RegistrationModel;
    mode!: string;

    @tracked currentModerator?: ModeratorModel;

    @computed('registration.{reviewsState,archiving}')
    get showTopbar() {
        return this.registration && !(this.registration.reviewsState === 'withdrawn' || this.registration.archiving);
    }

    @computed('mode', 'currentModerator')
    get canViewAsModerator() {
        if (this.mode === 'moderator' && Boolean(this.currentModerator)) {
            return true;
        }
        return false;
    }

    @task({ withTestWaiter: true })
    loadCurrentModerator =
    task(function *(this: OverviewHeader) {
        try {
            this.currentModerator = yield this.store.findRecord('moderator', this.currentUser.currentUserId!,
                {
                    adapterOptions: {
                        providerId: this.registration.provider.get('id'),
                    },
                });
        } catch (e) {
            captureException(e);
            this.toast.error(this.intl.t('registries.overviewHeader.needModeratorPermission'));
        }
    });

    didReceiveAttrs() {
        if (this.mode === 'moderator' && this.currentUser.currentUserId) {
            this.loadCurrentModerator.perform();
        }
    }
}
