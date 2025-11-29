Feature: Navigation
  As a user of the PIDKiln interface
  I want to navigate between different views
  So that I can access all features of the application

  Background:
    Given the PIDKiln frontend is loaded in a browser
    And the WebSocket is connected

  @navigation @sidebar
  Scenario: Sidebar navigation links
    Then the sidebar should display navigation links:
      | link        | hash        |
      | Dashboard   | #/          |
      | Programs    | #/programs  |
      | Logs        | #/logs      |
      | Preferences | #/preferences |
      | Debug       | #/debug     |
      | About       | #/about     |

  @navigation @hash-routing
  Scenario Outline: Navigate via hash routes
    When I navigate to "<hash>"
    Then I should see the "<view>" view
    And the "<link>" navigation link should be highlighted

    Examples:
      | hash       | view        | link        |
      | #/         | Dashboard   | Dashboard   |
      | #/programs | Programs    | Programs    |
      | #/logs     | Logs        | Logs        |
      | #/preferences | Preferences | Preferences |
      | #/debug    | Debug       | Debug       |
      | #/about    | About       | About       |
      | #/editor   | Editor      | Programs    |

  @navigation @default
  Scenario: Default view on page load
    When I load the page without a hash
    Then I should be on the Dashboard view
    And the URL hash should be "#/"

  @navigation @invalid-hash
  Scenario: Invalid hash route
    When I navigate to "#/invalid"
    Then I should be redirected to the Dashboard view

  @navigation @status-bar-persistent
  Scenario: Status bar persists across navigation
    Given I am on the Dashboard view
    When I navigate to the Programs view
    Then the status bar should still be visible
    And the status bar should show the same connection status
    And the status bar should show the same temperature values

  @navigation @controls-persistent
  Scenario: Sidebar controls persist across navigation
    Given I am on the Dashboard view
    When I navigate to the Preferences view
    Then the sidebar control buttons should still be visible
    And the program dropdown should still be accessible

