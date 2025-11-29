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
  Scenario: Program profile overlay when loaded but not started
    Given a program is loaded but not started
    Then the chart should display the program profile as a cyan dashed line
    And the profile should follow the current time (start at "now")
    And the profile should NOT drift to the left as time passes

  @dashboard @chart @program-profile @start-temp
  Scenario: Program profile starts at current kiln temperature
    Given the kiln is currently at 75°C
    When I load a program
    Then the program profile should start at 75°C on the chart
    And if the first segment has a ramp time, the profile should slope from 75°C to the first target
    And if the first segment has zero ramp time, the profile should show a vertical jump from 75°C

  @dashboard @chart @program-profile
  Scenario: Program profile anchors when started
    Given a program is loaded and started
    Then the profile should be anchored to the program start time
    And the profile should move left as time passes (locked to history)

  @dashboard @chart @program-profile
  Scenario: Program profile resets when new program loaded
    Given a program was previously run and stopped
    When I load a different program
    Then the profile should reset to follow current time
    And the profile should NOT remain anchored to the previous program's start time

  @dashboard @chart @program-profile
  Scenario: Program profile cleared when unloaded
    Given a program is loaded
    When I click the "Clear" button
    Then the program profile should be removed from the chart

  @dashboard @chart @program-profile
  Scenario: Program profile restores correctly on page reload while running
    Given a program is running
    When I reload the page
    Then the profile should be anchored to the original program start time
    And the profile should NOT reset to follow current time

  @dashboard @chart @program-profile
  Scenario: Program profile restores correctly on page reload after stopped
    Given a program was run and then stopped
    When I reload the page
    Then the profile should remain anchored to the original program start time
    And the profile should show where the program was relative to history

  @dashboard @chart @program-profile
  Scenario: Program profile stays anchored when stopped
    Given a program is running
    When I stop the program
    Then the profile should remain anchored to the original start time
    And the profile should NOT reset to follow current time

  @dashboard @chart @program-profile
  Scenario: Program profile re-anchors when restarted
    Given a program was run and then stopped
    And the profile is anchored to the original start time
    When I start the same program again (without loading a new one)
    Then the profile should anchor to the NEW start time
    And the profile should NOT remain at the old start time

  @dashboard @error
  Scenario: Error overlay displays when in ERROR state
    Given the backend enters an ERROR state
    And the error_message is "Thermocouple read failure"
    Then an error overlay should appear over the chart
    And the overlay should display the error message "Thermocouple read failure"
    And the overlay should have a "Dismiss & Clear Error" button

  @dashboard @error
  Scenario: Error overlay persists on page reload
    Given the backend is in ERROR state with message "Case overtemperature"
    When I reload the page
    Then the error overlay should still be visible
    And the error message should be "Case overtemperature"

  @dashboard @error
  Scenario: Dismissing error clears the state
    Given the error overlay is visible
    When I click the "Dismiss & Clear Error" button
    Then the error overlay should disappear
    And the status badge should show "STOPPED"
    And the kiln should continue cooling

