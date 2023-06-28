Extended tye defs in shared/utils/types/TEMP_user_flairs

Allow user flairs call stack
handleEditCommunity - [community] makes a request to the API and replaces the state with the repsonse
    onEditCommunity - [sidebar]
        onUpsertCommunity - [community-form]
            handleCreateCommunitySubmit - [render(community-form)]