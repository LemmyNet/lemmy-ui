import { CreateCommunity as CreateCommunityBase, EditCommunity as EditCommunityBase } from "lemmy-js-client";

export interface CreateCommunity extends CreateCommunityBase {
    user_flairs?: boolean;
}

export interface EditCommunity extends EditCommunityBase {
    user_flairs?: boolean;
}
