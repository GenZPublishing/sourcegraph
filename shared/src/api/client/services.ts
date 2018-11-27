import { PlatformContext } from '../../platform/context'
import { createContextService } from './context/contextService'
import { CommandRegistry } from './services/command'
import { ContributionRegistry } from './services/contribution'
import { TextDocumentDecorationProviderRegistry } from './services/decoration'
import { ExtensionsService } from './services/extensionsService'
import { TextDocumentHoverProviderRegistry } from './services/hover'
import { TextDocumentLocationProviderRegistry, TextDocumentReferencesProviderRegistry } from './services/location'
import { NotificationsService } from './services/notifications'
import { QueryTransformerRegistry } from './services/queryTransformer'
import { createSettingsService } from './services/settings'
import { ViewProviderRegistry } from './services/view'

/**
 * Services is a container for all services used by the client application.
 */
export class Services {
    constructor(private platformContext: Pick<PlatformContext, 'environment' | 'settings' | 'updateSettings'>) {}

    public readonly commands = new CommandRegistry()
    public readonly context = createContextService()
    public readonly notifications = new NotificationsService()
    public readonly settings = createSettingsService(this.platformContext)
    public readonly contribution = new ContributionRegistry(
        this.platformContext.environment,
        this.settings,
        this.context.data
    )
    public readonly extensions = new ExtensionsService(this.platformContext.environment, this.settings)
    public readonly textDocumentDefinition = new TextDocumentLocationProviderRegistry()
    public readonly textDocumentImplementation = new TextDocumentLocationProviderRegistry()
    public readonly textDocumentReferences = new TextDocumentReferencesProviderRegistry()
    public readonly textDocumentTypeDefinition = new TextDocumentLocationProviderRegistry()
    public readonly textDocumentHover = new TextDocumentHoverProviderRegistry()
    public readonly textDocumentDecoration = new TextDocumentDecorationProviderRegistry()
    public readonly queryTransformer = new QueryTransformerRegistry()
    public readonly views = new ViewProviderRegistry()
}
