Feature: Dashboard View
  As a user monitoring a kiln firing
  I want to see real-time temperature data and program status
  So that I can track the firing progress

  Background:
    Given the PIDKiln frontend is loaded in a browser
    And the WebSocket is connected
    And I am on the Dashboard view

  @dashboard @status-bar
  Scenario: Status bar displays current state
    Then the status bar should display:
      | field       | format          |
      | Kiln temp   | XXX.X°C         |
      | Target temp | XXX.X°C         |
      | Env temp    | XX.X°C          |
      | Heat        | XX%             |
    And the program status badge should be visible

  @dashboard @stats-cards
  Scenario: Dashboard shows statistics cards
    Then I should see a "Kiln Temperature" card with the current temperature
    And I should see a "Target Temperature" card with the set temperature
    And I should see a "Environment" card with the ambient temperature
    And I should see a "Heater Power" card with the heat percentage

  @dashboard @chart
  Scenario: Temperature chart displays history
    Then the temperature chart should be visible
    And the chart should show the last 24 hours of temperature data
    And the chart should have a "Kiln" line in orange
    And the chart should have a "Target" line in green dashed style
    And the chart should have an "Env" line in gray
    And the chart should have a "Case" line in gray

  @dashboard @chart @real-time
  Scenario: Chart updates in real-time
    Given the chart is displaying temperature history
    When a new temperature update is received via WebSocket
    Then the chart should add the new data point
    And the chart should auto-scroll if auto-scroll is enabled

  @dashboard @chart @zoom
  Scenario: Chart zoom controls
    Given the chart is displaying temperature history
    When I scroll the mouse wheel on the chart
    Then the chart should zoom in or out
    And the overview bar should update to show the current viewport

  @dashboard @chart @pan
  Scenario: Chart pan controls
    Given the chart is displaying temperature history
    When I click and drag on the chart
    Then the chart should pan left or right
    And auto-scroll should be disabled

  @dashboard @chart @reset-zoom
  Scenario: Reset zoom button
    Given the chart has been zoomed in
    When I click the "Reset Zoom" button
    Then the chart should return to the default 1-hour view
    And the current time should be positioned at 67% from the left

  @dashboard @chart @auto-scroll
  Scenario: Auto-scroll toggle
    Given auto-scroll is disabled
    When I click the "Auto Scroll" button
    Then the chart should snap to show current time
    And the button should show a pause icon
    And new data points should cause the chart to scroll

  @dashboard @chart @now-marker
  Scenario: Now marker on chart
    Then the chart should display a vertical "Now" marker
    And the marker should indicate the current time position

  @dashboard @chart @overview-bar
  Scenario: Overview bar navigation
    Given the chart is displaying temperature history
    Then the overview bar should show the current viewport position
    When I click and drag on the overview bar
    Then the main chart should pan to the corresponding position

  @dashboard @chart @program-profile
  Scenario: Program profile overlay
    Given a program is loaded
    Then the chart should display the program profile as a cyan dashed line
    And the profile should start at the current time if not running
    And the profile should be anchored to start time if running

